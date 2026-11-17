import { Router } from "express";
import { getValidated, validate } from "../middleware/validate";
import { inventoryService } from "../services/inventory.service";
import { playerService } from "../services/player.service";
import { asyncHandler } from "../utils/asyncHandler";
import {
  hotbarSlotParam,
  HotbarSlotParam,
  setHotbarBody,
  SetHotbarDto,
  useItemBody,
  UseItemDto,
} from "../validators/inventory.validators";
import {
  listPlayersQuery,
  movePlayerBody,
  MovePlayerDto,
  registerBody,
  updatePlayerBody,
  uuidParam,
  UuidParam,
} from "../validators/player.validators";
import { createCrudRouter } from "./crud.router";

const router = createCrudRouter({
  path: "players",
  idKey: "id",
  idType: "uuid",
  service: playerService,
  listQuery: listPlayersQuery,
  createBody: registerBody,
  updateBody: updatePlayerBody,
});

router.get("/players/:id/state", validate({ params: uuidParam }), asyncHandler(async (_req, res) => {
  const { params } = getValidated<unknown, UuidParam>(res);
  res.json(await playerService.getFullState(params.id));
}));

router.post("/players/:id/move", validate({ params: uuidParam, body: movePlayerBody }), asyncHandler(async (_req, res) => {
  const { params, body } = getValidated<MovePlayerDto, UuidParam>(res);
  res.json(await playerService.move(params.id, body));
}));

router.post("/players/:id/heal", validate({ params: uuidParam }), asyncHandler(async (_req, res) => {
  const { params } = getValidated<unknown, UuidParam>(res);
  res.json(await playerService.healParty(params.id));
}));

router.post("/players/:id/inventory/use", validate({ params: uuidParam, body: useItemBody }), asyncHandler(async (_req, res) => {
  const { params, body } = getValidated<UseItemDto, UuidParam>(res);
  res.json(await inventoryService.useItem(params.id, body));
}));

router.put("/players/:id/hotbar/:slot", validate({ params: hotbarSlotParam, body: setHotbarBody }), asyncHandler(async (_req, res) => {
  const { params, body } = getValidated<SetHotbarDto, HotbarSlotParam>(res);
  res.json(await inventoryService.setHotbarSlot(params.id, params.slot, body));
}));

router.delete("/players/:id/hotbar/:slot", validate({ params: hotbarSlotParam }), asyncHandler(async (_req, res) => {
  const { params } = getValidated<unknown, HotbarSlotParam>(res);
  await inventoryService.clearHotbarSlot(params.id, params.slot);
  res.status(204).send();
}));

export default router;