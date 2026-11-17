import { IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import {
  Creature,
  CreatureMove,
  HotbarSlot,
  Inventory,
  Item,
  MapTile,
  Npc,
  Player,
  Species,
  SpeciesMove,
} from "../entity";
import { AppError } from "../utils/AppError";
import { applySort, paginate } from "../utils/pagination";
import {
  ListPlayersQuery,
  LoginDto,
  MovePlayerDto,
  RegisterDto,
  UpdatePlayerDto,
} from "../validators/player.validators";
import { createCrudService } from "./crud.service";

const crud = createCrudService<Player, Partial<Player>, UpdatePlayerDto>({
  label: "Player",
  entity: Player,
  idKey: "id",
  relations: { tile: true, respawnTile: true },
});

export function calcMaxHp(baseHp: number, level: number): number {
  return Math.floor((2 * baseHp * level) / 100) + level + 10;
}

export const playerService = {
  ...crud,

  async list(q: ListPlayersQuery) {
    const qb = crud.repo().createQueryBuilder("p");
    if (q.q) {
      qb.andWhere("(p.username ILIKE :s OR p.trainerName ILIKE :s OR p.email ILIKE :s)", { s: `%${q.q}%` });
    }
    applySort(qb, "p", q.sortBy, q.order, "createdAt");
    return paginate(qb, q);
  },

  async getFullState(id: string) {
    const player = await crud.repo().findOne({
      where: { id },
      relations: {
        inventory: { item: true },
        hotbarSlots: { item: true },
      },
    });
    if (!player) throw new AppError(404, "NOT_FOUND", "Player not found");

    const creatures = await AppDataSource.getRepository(Creature).find({
      where: { ownerId: id, releasedAt: IsNull() },
      relations: { species: true, moves: { move: true } },
      order: { partySlot: "ASC", storageSlot: "ASC" },
    });

    const { passwordHash: _omit, ...safePlayer } = player;
    return { ...safePlayer, creatures };
  },

  async register(dto: RegisterDto) {
    return AppDataSource.transaction(async (manager) => {
      const starter = await manager.findOneBy(Species, { id: dto.starterSpeciesId });
      if (!starter) throw new AppError(400, "INVALID_STARTER", "Starter species does not exist");

      const spawnTile = await manager.findOneBy(MapTile, { x: 0, y: 0 });
      if (!spawnTile) throw new AppError(500, "MISSING_SPAWN", "Default spawn tile (0,0) does not exist");

      const player = manager.create(Player, {
        email: dto.email,
        username: dto.username,
        passwordHash: dto.password, // swap for bcrypt hash in production
        trainerName: dto.trainerName,
        posX: 0,
        posY: 0,
        respawnX: 0,
        respawnY: 0,
        lastLoginAt: new Date(),
      });
      await manager.save(player);

      const starterMoves = await manager.find(SpeciesMove, {
        where: { speciesId: starter.id },
        relations: { move: true },
        order: { level: "ASC" },
        take: 4,
      });

      const creature = manager.create(Creature, {
        ownerId: player.id,
        speciesId: starter.id,
        level: 5,
        experience: 125,
        currentHp: calcMaxHp(starter.baseHp, 5),
        partySlot: 1,
        storageSlot: null,
        moves: starterMoves
          .filter((sm) => sm.level <= 5 && sm.move)
          .map((sm, idx) =>
            manager.create(CreatureMove, {
              slot: idx + 1,
              moveId: sm.moveId,
              currentPp: sm.move!.maxPp,
            }),
          ),
      });
      await manager.save(creature);

      const starterItems = await manager.find(Item);
      const ball = starterItems.find((i) => i.name === "Catch Ball");
      const potion = starterItems.find((i) => i.name === "Potion");
      if (ball) {
        await manager.save(manager.create(Inventory, { playerId: player.id, itemId: ball.id, quantity: 5 }));
        await manager.save(manager.create(HotbarSlot, { playerId: player.id, slot: 1, itemId: ball.id }));
      }
      if (potion) {
        await manager.save(manager.create(Inventory, { playerId: player.id, itemId: potion.id, quantity: 3 }));
        await manager.save(manager.create(HotbarSlot, { playerId: player.id, slot: 2, itemId: potion.id }));
      }

      return this.getFullState(player.id);
    });
  },

  async login(dto: LoginDto) {
    const player = await crud
      .repo()
      .createQueryBuilder("p")
      .where("p.email = :login OR p.username = :login", { login: dto.login })
      .getOne();

    if (!player || player.passwordHash !== dto.password) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username/email or password");
    }

    await crud.repo().update({ id: player.id }, { lastLoginAt: new Date() });
    return this.getFullState(player.id);
  },

  async move(id: string, dto: MovePlayerDto) {
    const player = await crud.repo().findOneBy({ id });
    if (!player) throw new AppError(404, "NOT_FOUND", "Player not found");

    const tile = await AppDataSource.getRepository(MapTile).findOneBy({ x: dto.x, y: dto.y });
    if (!tile || !tile.isWalkable) {
      throw new AppError(400, "BLOCKED_TILE", "Target tile does not exist or is not walkable");
    }

    const blockingNpc = await AppDataSource.getRepository(Npc).findOneBy({ posX: dto.x, posY: dto.y });
    if (blockingNpc) {
      throw new AppError(409, "NPC_ON_TILE", `Tile is occupied by ${blockingNpc.name}`);
    }

    await crud.repo().update({ id }, { posX: dto.x, posY: dto.y });
    return { posX: dto.x, posY: dto.y, terrain: tile.terrain };
  },

  async healParty(id: string) {
    const player = await crud.repo().findOneBy({ id });
    if (!player) throw new AppError(404, "NOT_FOUND", "Player not found");

    const party = await AppDataSource.getRepository(Creature).find({
      where: { ownerId: id, releasedAt: IsNull() },
      relations: { species: true, moves: { move: true } },
    });

    for (const c of party) {
      if (c.partySlot !== null && c.species) {
        c.currentHp = calcMaxHp(c.species.baseHp, c.level);
        c.status = "none";
        for (const cm of c.moves ?? []) {
          if (cm.move) cm.currentPp = cm.move.maxPp;
        }
      }
    }

    await AppDataSource.getRepository(Creature).save(party);
    await crud.repo().update({ id }, { respawnX: player.posX, respawnY: player.posY });

    return { healedCount: party.filter((c) => c.partySlot !== null).length };
  },
};