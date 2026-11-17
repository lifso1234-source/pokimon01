import { AppDataSource } from "../data-source";
import { CatchHistory, PlayerCatchStat } from "../entity";
import { paginate } from "../utils/pagination";
import { ListCatchHistoryQuery } from "../validators/battle.validators";

export const catchHistoryService = {
  async listByPlayer(playerId: string, q: ListCatchHistoryQuery) {
    const qb = AppDataSource.getRepository(CatchHistory)
      .createQueryBuilder("ch")
      .leftJoinAndSelect("ch.species", "species")
      .leftJoinAndSelect("ch.ballItem", "ballItem")
      .where("ch.playerId = :playerId", { playerId });

    if (q.outcome) qb.andWhere("ch.outcome = :outcome", { outcome: q.outcome });
    if (q.speciesId) qb.andWhere("ch.speciesId = :speciesId", { speciesId: q.speciesId });

    qb.orderBy("ch.createdAt", "DESC");
    return paginate(qb, q);
  },

  async getPokedexStats(playerId: string) {
    return AppDataSource.getRepository(PlayerCatchStat).find({
      where: { playerId },
      order: { speciesId: "ASC" },
    });
  },
};
