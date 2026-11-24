import bcrypt from "bcryptjs";
import { In, LessThanOrEqual } from "typeorm";
import { AppDataSource } from "../data-source";
import {
  Creature,
  CreatureMove,
  HotbarSlot,
  Inventory,
  Item,
  MapTile,
  Player,
  Species,
  SpeciesMove,
} from "../entity";
import { AppError } from "../utils/AppError";
import { signToken } from "../utils/jwt";
import {
  LoginDto,
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

export const loginPlayerService = {
  ...crud,

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    return AppDataSource.transaction(async (manager) => {
      // 1. Run all initial validation & lookup reads in parallel
      const [starter, spawnTile, starterMoves, starterItems] =
        await Promise.all([
          manager.findOneBy(Species, { id: dto.starterSpeciesId }),
          manager.findOneBy(MapTile, { x: 200, y: 180 }),
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
        passwordHash,
        trainerName: dto.trainerName,
        posX: 180,
        posY: 100,
        respawnX: 180,
        respawnY: 100,
        lastLoginAt: new Date(),
      });
      await manager.save(player);

      // 3. Save creature first so `creature.id` is generated before creating moves
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
      });
      await manager.save(creature);

      const creatureMoves = validMoves.map((sm, idx) =>
        manager.create(CreatureMove, {
          creatureId: creature.id,
          slot: idx + 1,
          moveId: sm.moveId,
          move: sm.move!,
          currentPp: sm.move!.maxPp,
        }),
      );

      // 4. Build inventory & hotbar arrays in memory
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

      // 5. Batch-save moves, inventory, and hotbar slots in parallel
      await Promise.all([
        creatureMoves.length ? manager.save(creatureMoves) : Promise.resolve(),
        inventory.length ? manager.save(inventory) : Promise.resolve(),
        hotbarSlots.length ? manager.save(hotbarSlots) : Promise.resolve(),
      ]);

      creature.moves = creatureMoves;

      // 6. Return token + player state
      const { passwordHash: _omit, ...safePlayer } = player;
      const token = signToken(player.id);

      return {
        token,
        player: {
          ...safePlayer,
          inventory,
          hotbarSlots,
          creatures: [creature],
        },
      };
    });
  },

  async login(dto: LoginDto) {
    const player = await crud
      .repo()
      .createQueryBuilder("p")
      .addSelect("p.passwordHash")
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

    if (
      !player ||
      !player.passwordHash ||
      !(await bcrypt.compare(dto.password, player.passwordHash))
    ) {
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid username/email or password",
      );
    }

    const now = new Date();
    await crud.repo().update({ id: player.id }, { lastLoginAt: now });

    const { passwordHash: _omit, ...safePlayer } = player;
    const token = signToken(player.id);

    return {
      token,
      player: {
        ...safePlayer,
        lastLoginAt: now,
      },
    };
  },
};