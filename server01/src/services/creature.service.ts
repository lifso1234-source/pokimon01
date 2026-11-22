import { IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import { Creature, CreatureMove, Evolution, Inventory, Move, Species } from "../entity";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/pagination";
import {
  EvolveCreatureDto,
  LearnMoveDto,
  ListPlayerCreaturesQuery,
  UpdateCreatureDto,
} from "../validators/creature.validators";
import { createCrudService } from "./crud.service";
import { calcMaxHp } from "./player.service";

const crud = createCrudService<Creature, Partial<Creature>, UpdateCreatureDto>({
  label: "Creature",
  entity: Creature,
  idKey: "id",
  relations: { species: true, moves: { move: true } },
});

export const creatureService = {
  ...crud,

  async listByPlayer(playerId: string, q: ListPlayerCreaturesQuery) {
    const qb = crud
      .repo()
      .createQueryBuilder("c")
      .leftJoinAndSelect("c.species", "species")
      .leftJoinAndSelect("c.moves", "moves")
      .leftJoinAndSelect("moves.move", "move")
      .where("c.ownerId = :playerId", { playerId })
      .andWhere("c.releasedAt IS NULL");

    if (q.location === "party") qb.andWhere("c.partySlot IS NOT NULL");
    if (q.location === "storage") qb.andWhere("c.storageSlot IS NOT NULL");

    qb.orderBy("c.partySlot", "ASC", "NULLS LAST").addOrderBy("c.storageSlot", "ASC", "NULLS LAST");
    return paginate(qb, q);
  },

  async updateSlotOrNickname(id: string, dto: UpdateCreatureDto) {
    const creature = await crud.getById(id);
    if (creature.releasedAt) throw new AppError(400, "RELEASED", "Cannot modify a released creature");

    if (dto.nickname !== undefined) creature.nickname = dto.nickname;

    if (dto.partySlot !== undefined) {
      creature.partySlot = dto.partySlot;
      if (dto.partySlot !== null) creature.storageSlot = null;
    }
    if (dto.storageSlot !== undefined) {
      creature.storageSlot = dto.storageSlot;
      if (dto.storageSlot !== null) creature.partySlot = null;
    }

    if (creature.partySlot === null && creature.storageSlot === null) {
      throw new AppError(400, "INVALID_SLOT", "Creature must occupy either a partySlot or a storageSlot");
    }

    await crud.repo().save(creature);
    return crud.getById(id);
  },

  async learnMove(id: string, dto: LearnMoveDto) {
    const creature = await crud.getById(id);
    const move = await AppDataSource.getRepository(Move).findOneBy({ id: dto.moveId });
    if (!move) throw new AppError(404, "NOT_FOUND", "Move not found");

    const moveRepo = AppDataSource.getRepository(CreatureMove);
    const existing = await moveRepo.findOneBy({ creatureId: id, slot: dto.slot });
    if (existing) {
      existing.moveId = move.id;
      existing.currentPp = move.maxPp;
      await moveRepo.save(existing);
    } else {
      await moveRepo.save(
        moveRepo.create({ creatureId: id, slot: dto.slot, moveId: move.id, currentPp: move.maxPp }),
      );
    }

    return crud.getById(id);
  },

  async evolve(id: string, dto: EvolveCreatureDto) {
    return AppDataSource.transaction(async (manager) => {
      const creature = await manager.findOne(Creature, {
        where: { id, releasedAt: IsNull() },
        relations: { species: true },
      });
      if (!creature || !creature.species) throw new AppError(404, "NOT_FOUND", "Creature not found");

      const evo = await manager.findOneBy(Evolution, {
        fromSpeciesId: creature.speciesId,
        toSpeciesId: dto.toSpeciesId,
      });
      if (!evo) throw new AppError(400, "INVALID_EVOLUTION", "Invalid evolution path for this species");
      if (evo.minLevel && creature.level < evo.minLevel) {
        throw new AppError(400, "LEVEL_TOO_LOW", `Requires level ${evo.minLevel}`);
      }
      if (evo.itemId) {
        if (dto.itemId !== evo.itemId) throw new AppError(400, "ITEM_REQUIRED", "Evolution item required");
        const inv = await manager.findOneBy(Inventory, { playerId: creature.ownerId, itemId: evo.itemId });
        if (!inv || inv.quantity < 1) throw new AppError(400, "MISSING_ITEM", "Player does not own the evolution item");
        if (inv.quantity === 1) await manager.remove(inv);
        else {
          inv.quantity -= 1;
          await manager.save(inv);
        }
      }

      const nextSpecies = await manager.findOneByOrFail(Species, { id: dto.toSpeciesId });
      const oldMax = calcMaxHp(creature.species.baseHp, creature.level);
      const newMax = calcMaxHp(nextSpecies.baseHp, creature.level);

      creature.speciesId = nextSpecies.id;
      creature.currentHp = Math.min(newMax, creature.currentHp + Math.max(0, newMax - oldMax));
      await manager.save(creature);

      return crud.getById(id);
    });
  },

  async release(id: string) {
    const creature = await crud.getById(id);
    if (creature.partySlot !== null) {
      const partyCount = await crud.repo().count({
        where: { ownerId: creature.ownerId, releasedAt: IsNull() },
      });
      if (partyCount <= 1) {
        throw new AppError(400, "LAST_CREATURE", "Cannot release your last remaining creature");
      }
    }
    creature.partySlot = null;
    creature.storageSlot = null;
    creature.releasedAt = new Date();
    await crud.repo().save(creature);
  },
};
