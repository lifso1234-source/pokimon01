import { AppDataSource } from "../data-source";
import { Item, Move, Species, TypeEffectiveness } from "../entity";
import { applySort, paginate } from "../utils/pagination";
import { assertRefExists } from "../utils/refs";
import {
  CreateItemDto,
  CreateMoveDto,
  CreateSpeciesDto,
  ListItemsQuery,
  ListMovesQuery,
  ListSpeciesQuery,
  UpdateItemDto,
  UpdateMoveDto,
  UpdateSpeciesDto,
} from "../validators/reference.validators";
import { createCrudService } from "./crud.service";

const speciesCrud = createCrudService<Species, CreateSpeciesDto, UpdateSpeciesDto>({
  label: "Species",
  entity: Species,
  idKey: "id",
  relations: { speciesMoves: { move: true }, evolutionsFrom: { toSpecies: true, item: true } },
});

const movesCrud = createCrudService<Move, CreateMoveDto, UpdateMoveDto>({
  label: "Move",
  entity: Move,
  idKey: "id",
});

const itemsCrud = createCrudService<Item, CreateItemDto, UpdateItemDto>({
  label: "Item",
  entity: Item,
  idKey: "id",
  relations: { teachesMove: true },
  beforeWrite: async (dto) => {
    if (dto.teachesMoveId) await assertRefExists(Move, "id", dto.teachesMoveId, "Move");
  },
});

export const referenceService = {
  species: {
    ...speciesCrud,
    async list(q: ListSpeciesQuery) {
      const qb = speciesCrud.repo().createQueryBuilder("s");
      if (q.q) qb.andWhere("s.name ILIKE :s", { s: `%${q.q}%` });
      if (q.type) qb.andWhere("(s.type1 = :t OR s.type2 = :t)", { t: q.type });
      applySort(qb, "s", q.sortBy, q.order, "dexNumber");
      return paginate(qb, q);
    },
  },

  moves: {
    ...movesCrud,
    async list(q: ListMovesQuery) {
      const qb = movesCrud.repo().createQueryBuilder("m");
      if (q.q) qb.andWhere("m.name ILIKE :s", { s: `%${q.q}%` });
      if (q.type) qb.andWhere("m.type = :t", { t: q.type });
      if (q.category) qb.andWhere("m.category = :c", { c: q.category });
      applySort(qb, "m", q.sortBy, q.order, "id");
      return paginate(qb, q);
    },
  },

  items: {
    ...itemsCrud,
    async list(q: ListItemsQuery) {
      const qb = itemsCrud.repo().createQueryBuilder("i");
      if (q.q) qb.andWhere("i.name ILIKE :s", { s: `%${q.q}%` });
      if (q.category) qb.andWhere("i.category = :c", { c: q.category });
      applySort(qb, "i", q.sortBy, q.order, "id");
      return paginate(qb, q);
    },
  },

  async getTypeEffectiveness() {
    return AppDataSource.getRepository(TypeEffectiveness).find();
  },
};
