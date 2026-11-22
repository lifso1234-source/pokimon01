import { Router } from "express";
import { getValidated, validate } from "../middleware/validate";
import { mapService } from "../services/map.service";
import { asyncHandler } from "../utils/asyncHandler";
import { createEncounterBody, listEncountersQuery, updateEncounterBody } from "../validators/map.validators";
import { playerIdParam, PlayerIdParam } from "../validators/player.validators";
import { createCrudRouter } from "./crud.router";

const router = Router();

router.get("/map/tiles", asyncHandler(async (_req, res) => {
  res.json(await mapService.getAllTiles());
}));

router.get("/map/state/:playerId", validate({ params: playerIdParam }), asyncHandler(async (_req, res) => {
  const { params } = getValidated<unknown, PlayerIdParam>(res);
  res.json(await mapService.getWorldState(params.playerId));
}));

const encounterRouter = createCrudRouter({
  path: "encounters",
  idKey: "id",
  service: mapService.encounters,
  listQuery: listEncountersQuery,
  createBody: createEncounterBody,
  updateBody: updateEncounterBody,
});

router.use(encounterRouter);

export default router;
