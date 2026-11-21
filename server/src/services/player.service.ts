import { IsNull, In, LessThanOrEqual } from "typeorm";
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
      qb.andWhere(
        "(p.username ILIKE :s OR p.trainerName ILIKE :s OR p.email ILIKE :s)",
        { s: `%${q.q}%` },
      );
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
      // 1. Run all initial validation & lookup reads in parallel (1 round-trip batch)
      const [starter, spawnTile, starterMoves, starterItems] =
        await Promise.all([
          manager.findOneBy(Species, { id: dto.starterSpeciesId }),
          manager.findOneBy(MapTile, { x: 0, y: 0 }),
          manager.find(SpeciesMove, {
            where: {
              speciesId: dto.starterSpeciesId,
              level: LessThanOrEqual(5),
            },
            relations: { move: true },
            order: { level: "ASC" },
            take: 4,
          }),
          manager.findBy(Item, { name: In(["Catch Ball", "Potion"]) }),
        ]);

      if (!starter) {
        throw new AppError(
          400,
          "INVALID_STARTER",
          "Starter species does not exist",
        );
      }
      if (!spawnTile) {
        throw new AppError(
          500,
          "MISSING_SPAWN",
          "Default spawn tile (0,0) does not exist",
        );
      }

      // 2. Save player
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

      // 3. Build creature + attach already-fetched move & species objects in memory
      const validMoves = starterMoves.filter((sm) => sm.move);
      const creature = manager.create(Creature, {
        ownerId: player.id,
        speciesId: starter.id,
        species: starter,
        level: 5,
        experience: 125,
        currentHp: calcMaxHp(starter.baseHp, 5),
        partySlot: 1,
        storageSlot: null,
        moves: validMoves.map((sm, idx) =>
          manager.create(CreatureMove, {
            slot: idx + 1,
            moveId: sm.moveId,
            move: sm.move!,
            currentPp: sm.move!.maxPp,
          }),
        ),
      });

      // 4. Build inventory & hotbar arrays in memory + attach already-fetched item objects
      const ball = starterItems.find((i) => i.name === "Catch Ball");
      const potion = starterItems.find((i) => i.name === "Potion");

      const inventory: Inventory[] = [];
      const hotbarSlots: HotbarSlot[] = [];

      if (ball) {
        inventory.push(
          manager.create(Inventory, {
            playerId: player.id,
            itemId: ball.id,
            item: ball,
            quantity: 5,
          }),
        );
        hotbarSlots.push(
          manager.create(HotbarSlot, {
            playerId: player.id,
            slot: 1,
            itemId: ball.id,
            item: ball,
          }),
        );
      }

      if (potion) {
        inventory.push(
          manager.create(Inventory, {
            playerId: player.id,
            itemId: potion.id,
            item: potion,
            quantity: 3,
          }),
        );
        hotbarSlots.push(
          manager.create(HotbarSlot, {
            playerId: player.id,
            slot: 2,
            itemId: potion.id,
            item: potion,
          }),
        );
      }

      // 5. Batch-save creature, inventory, and hotbar slots in parallel
      await Promise.all([
        manager.save(creature),
        inventory.length ? manager.save(inventory) : Promise.resolve(),
        hotbarSlots.length ? manager.save(hotbarSlots) : Promise.resolve(),
      ]);

      // 6. Assemble exact getFullState response with 0 extra DB reads
      const { passwordHash: _omit, ...safePlayer } = player;
      return {
        ...safePlayer,
        inventory,
        hotbarSlots,
        creatures: [creature],
      };
    });
  },

  async login(dto: LoginDto) {
    const player = await crud
      .repo()
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.inventory", "inv")
      .leftJoinAndSelect("inv.item", "invItem")
      .leftJoinAndSelect("p.hotbarSlots", "slot")
      .leftJoinAndSelect("slot.item", "slotItem")
      .leftJoinAndSelect("p.creatures", "c", "c.releasedAt IS NULL")
      .leftJoinAndSelect("c.species", "species")
      .leftJoinAndSelect("c.moves", "cm")
      .leftJoinAndSelect("cm.move", "move")
      .where("p.email = :login OR p.username = :login", { login: dto.login })
      .orderBy({
        "c.partySlot": "ASC",
        "c.storageSlot": "ASC",
      })
      .getOne();

    if (!player || player.passwordHash !== dto.password) {
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid username/email or password",
      );
    }

    const now = new Date();
    await crud.repo().update({ id: player.id }, { lastLoginAt: now });

    const { passwordHash: _omit, ...safePlayer } = player;
    return {
      ...safePlayer,
      lastLoginAt: now, // keeps the returned object in sync with the DB update
    };
  },

  async move(id: string, dto: MovePlayerDto) {
    const player = await crud.repo().findOneBy({ id });
    if (!player) throw new AppError(404, "NOT_FOUND", "Player not found");

    const tile = await AppDataSource.getRepository(MapTile).findOneBy({
      x: dto.x,
      y: dto.y,
    });
    if (!tile || !tile.isWalkable) {
      throw new AppError(
        400,
        "BLOCKED_TILE",
        "Target tile does not exist or is not walkable",
      );
    }

    const blockingNpc = await AppDataSource.getRepository(Npc).findOneBy({
      posX: dto.x,
      posY: dto.y,
    });
    if (blockingNpc) {
      throw new AppError(
        409,
        "NPC_ON_TILE",
        `Tile is occupied by ${blockingNpc.name}`,
      );
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
    await crud
      .repo()
      .update({ id }, { respawnX: player.posX, respawnY: player.posY });

    return { healedCount: party.filter((c) => c.partySlot !== null).length };
  },
};
