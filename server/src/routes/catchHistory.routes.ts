import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { getValidated, validate } from "../middleware/validate";
import { catchHistoryService } from "../services";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import {
  listCatchHistoryQuery,
  ListCatchHistoryQuery,
} from "../validators/battle.validators";

const router = Router();

router.get(
  "/",
  authenticate,
  validate({ query: listCatchHistoryQuery }),
  asyncHandler(async (req, res) => {
    if (!req.playerId) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }
    const validated = getValidated(res);
    const query = validated.query as ListCatchHistoryQuery;
    const history = await catchHistoryService.listByPlayer(req.playerId, query);

    res.status(200).json(history);
  }),
);

router.get(
  "/pokedex",
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.playerId) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    const stats = await catchHistoryService.getPokedexStats(req.playerId);

    res.status(200).json(stats);
  }),
);

export default router;
