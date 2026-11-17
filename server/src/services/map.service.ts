import { IsNull, Not } from "typeorm";
import { AppDataSource } from "../data-source";
import { Encounter, MapTile, Npc, Species } from "../entity";
import { applySort, paginate } from "../utils/pagination";
import { assertRefExists } from "../utils/refs";
import { CreateEncounterDto, ListEncountersQuery, UpdateEncounterDto } from "../validators/map.validators";
import { createCrudService } from "./crud.service";
import { playerService } from "./player.service";

const encounterCrud = createCrudService<Encounter, CreateEncounterDto, UpdateEncounterDto>({
  label: "Encounter",
  entity: Encounter,
  idKey: "id",
  relations: { species: true },
  beforeWrite: async (dto) => {
    if (dto.speciesId) await assertRefExists(Species, "id", dto.speciesId, "Species");
  },
});

export const mapService = {
  encounters: {
    ...encounterCrud,
    async list(q: ListEncountersQuery) {
      const qb = encounterCrud.repo().createQueryBuilder("e").leftJoinAndSelect("e.species", "species");
      if (q.terrain) qb.andWhere("e.terrain = :terrain", { terrain: q.terrain });
      if (q.speciesId) qb.andWhere("e.speciesId = :speciesId", { speciesId: q.speciesId });
      applySort(qb, "e", q.sortBy, q.order, "id");
      return paginate(qb, q);
    },
  },

  async getAllTiles() {
    return AppDataSource.getRepository(MapTile).find({ order: { y: "ASC", x: "ASC" } });
  },

  async getWorldState(playerId: string) {
    const [tiles, npcs, player] = await Promise.all([
      this.getAllTiles(),
      AppDataSource.getRepository(Npc).find({
        where: { posX: Not(IsNull()) },
        relations: { party: { species: true }, shopItems: { item: true } },
      }),
      playerService.getFullState(playerId),
    ]);
    return { tiles, npcs, player };
  },
};
