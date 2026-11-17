import { Router } from "express";
import { getValidated, validate } from "../middleware/validate";
import { battleService } from "../services/battle.service";
import { asyncHandler } from "../utils/asyncHandler";
import {
  attackTurnBody,
  AttackTurnDto,
  battleIdParam,
  BattleIdParam,
  itemTurnBody,
  ItemTurnDto,
  startNpcBattleBody,
  StartNpcBattleDto,
  startWildBattleBody,
  StartWildBattleDto,
  switchTurnBody,
  SwitchTurnDto,
} from "../validators/battle.validators";
import { playerIdParam, PlayerIdParam } from "../validators/player.validators";

const router = Router();

router.get("/battles/active/:playerId", validate({ params: playerIdParam }), asyncHandler(async (_req, res) => {
  const { params } = getValidated<unknown, PlayerIdParam>(res);
  res.json(await battleService.getActiveBattle(params.playerId));
}));

router.get("/battles/:id", validate({ params: battleIdParam }), asyncHandler(async (_req, res) => {
  const { params } = getValidated<unknown, BattleIdParam>(res);
  res.json(await battleService.getBattleById(params.id));
}));

router.post("/battles/wild", validate({ body: startWildBattleBody }), asyncHandler(async (_req, res) => {
  const { body } = getValidated<StartWildBattleDto>(res);
  res.status(201).json(await battleService.startWildBattle(body));
}));

router.post("/battles/npc", validate({ body: startNpcBattleBody }), asyncHandler(async (_req, res) => {
  const { body } = getValidated<StartNpcBattleDto>(res);
  res.status(201).json(await battleService.startNpcBattle(body));
}));

router.post("/battles/:id/turn/attack", validate({ params: battleIdParam, body: attackTurnBody }), asyncHandler(async (_req, res) => {
  const { params, body } = getValidated<AttackTurnDto, BattleIdParam>(res);
  res.json(await battleService.executeAttack(params.id, body));
}));

router.post("/battles/:id/turn/switch", validate({ params: battleIdParam, body: switchTurnBody }), asyncHandler(async (_req, res) => {
  const { params, body } = getValidated<SwitchTurnDto, BattleIdParam>(res);
  res.json(await battleService.switchCreature(params.id, body));
}));

router.post("/battles/:id/turn/item", validate({ params: battleIdParam, body: itemTurnBody }), asyncHandler(async (_req, res) => {
  const { params, body } = getValidated<ItemTurnDto, BattleIdParam>(res);
  res.json(await battleService.useBattleItem(params.id, body));
}));

router.post("/battles/:id/turn/flee", validate({ params: battleIdParam }), asyncHandler(async (_req, res) => {
  const { params } = getValidated<unknown, BattleIdParam>(res);
  res.json(await battleService.flee(params.id));
}));

export default router;