import { IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import { Creature, MapTile, Npc, Player } from "../entity";
import { AppError } from "../utils/AppError";
import { applySort, paginate } from "../utils/pagination";
import {
  ListPlayersQuery,
  MovePlayerDto,
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
