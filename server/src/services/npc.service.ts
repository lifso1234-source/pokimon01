import { AppDataSource } from "../data-source";
import { Npc, PlayerNpcDefeat } from "../entity";
import { applySort, paginate } from "../utils/pagination";
import { CreateNpcDto, ListNpcsQuery, UpdateNpcDto } from "../validators/npc.validators";
import { createCrudService } from "./crud.service";

const crud = createCrudService<Npc, CreateNpcDto, UpdateNpcDto>({
  label: "Npc",
  entity: Npc,
  idKey: "id",
  relations: { party: { species: true }, shopItems: { item: true } },
});

export const npcService = {
  ...crud,

  async list(q: ListNpcsQuery) {
    const qb = crud
      .repo()
      .createQueryBuilder("n")
      .leftJoinAndSelect("n.party", "party")
      .leftJoinAndSelect("party.species", "species")
      .leftJoinAndSelect("n.shopItems", "shopItems")
      .leftJoinAndSelect("shopItems.item", "item");

    if (q.role) qb.andWhere("n.role = :role", { role: q.role });
    if (q.q) qb.andWhere("n.name ILIKE :s", { s: `%${q.q}%` });
    applySort(qb, "n", q.sortBy, q.order, "id");
    return paginate(qb, q);
  },

  async listDefeatsByPlayer(playerId: string) {
    return AppDataSource.getRepository(PlayerNpcDefeat).find({
      where: { playerId },
      relations: { npc: true },
      order: { lastDefeatedAt: "DESC" },
    });
  },
};
