import { Router } from "express";
import { getValidated, validate } from "../middleware/validate";
import { creatureService } from "../services/creature.service";
import { asyncHandler } from "../utils/asyncHandler";
import {
  evolveCreatureBody,
  EvolveCreatureDto,
  learnMoveBody,
  LearnMoveDto,
  listPlayerCreaturesQuery,
  ListPlayerCreaturesQuery,
  updateCreatureBody,
  UpdateCreatureDto,
} from "../validators/creature.validators";
import { playerIdParam, PlayerIdParam, uuidParam, UuidParam } from "../validators/player.validators";

const router = Router();

router.get(
  "/players/:playerId/creatures",
  validate({ params: playerIdParam, query: listPlayerCreaturesQuery }),
  asyncHandler(async (_req, res) => {
    const { params, query } = getValidated<unknown, PlayerIdParam, ListPlayerCreaturesQuery>(res);
    res.json(await creatureService.listByPlayer(params.playerId, query));
  }),
);

router.get("/creatures/:id", validate({ params: uuidParam }), asyncHandler(async (_req, res) => {
  const { params } = getValidated<unknown, UuidParam>(res);
  res.json(await creatureService.getById(params.id));
}));

router.patch("/creatures/:id", validate({ params: uuidParam, body: updateCreatureBody }), asyncHandler(async (_req, res) => {
  const { params, body } = getValidated<UpdateCreatureDto, UuidParam>(res);
  res.json(await creatureService.update(params.id, body));
}));

router.delete("/creatures/:id", validate({ params: uuidParam }), asyncHandler(async (_req, res) => {
  const { params } = getValidated<unknown, UuidParam>(res);
  res.json(await creatureService.release(params.id));
}));

router.post("/creatures/:id/moves", validate({ params: uuidParam, body: learnMoveBody }), asyncHandler(async (_req, res) => {
  const { params, body } = getValidated<LearnMoveDto, UuidParam>(res);
  res.json(await creatureService.learnMove(params.id, body));
}));

router.post("/creatures/:id/evolve", validate({ params: uuidParam, body: evolveCreatureBody }), asyncHandler(async (_req, res) => {
  const { params, body } = getValidated<EvolveCreatureDto, UuidParam>(res);
  res.json(await creatureService.evolve(params.id, body));
}));

export default router;