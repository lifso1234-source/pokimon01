import { Router } from "express";
import { referenceService } from "../services/reference.service";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createItemBody,
  createMoveBody,
  createSpeciesBody,
  listItemsQuery,
  listMovesQuery,
  listSpeciesQuery,
  updateItemBody,
  updateMoveBody,
  updateSpeciesBody,
} from "../validators/reference.validators";
import { createCrudRouter } from "./crud.router";

const router = Router();

router.use(
  createCrudRouter({
    path: "species",
    idKey: "id",
    service: referenceService.species,
    listQuery: listSpeciesQuery,
    createBody: createSpeciesBody,
    updateBody: updateSpeciesBody,
  }),
);

router.use(
  createCrudRouter({
    path: "moves",
    idKey: "id",
    service: referenceService.moves,
    listQuery: listMovesQuery,
    createBody: createMoveBody,
    updateBody: updateMoveBody,
  }),
);

router.use(
  createCrudRouter({
    path: "items",
    idKey: "id",
    service: referenceService.items,
    listQuery: listItemsQuery,
    createBody: createItemBody,
    updateBody: updateItemBody,
  }),
);

router.get("/type-effectiveness", asyncHandler(async (_req, res) => {
  res.json(await referenceService.getTypeEffectiveness());
}));

export default router;
