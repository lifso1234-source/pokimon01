import { z } from "zod";
import { paginationQuery } from "../utils/pagination";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const battleIdParam = z.object({
  id: z.string().regex(uuidRegex, "Invalid UUID"),
});
export type BattleIdParam = z.infer<typeof battleIdParam>;

export const listBattlesQuery = paginationQuery.extend({
  playerId: z.string().regex(uuidRegex, "Invalid UUID").optional(),
  status: z.enum(["active", "won", "lost", "fled", "caught"]).optional(),
  kind: z.enum(["wild", "npc"]).optional(),
});
export type ListBattlesQuery = z.infer<typeof listBattlesQuery>;

export const startWildBattleBody = z.object({
  playerId: z.string().regex(uuidRegex, "Invalid UUID"),
  speciesId: z.number().int().positive().optional(),
  level: z.number().int().min(1).max(100).optional(),
});
export type StartWildBattleDto = z.infer<typeof startWildBattleBody>;

export const startNpcBattleBody = z.object({
  playerId: z.string().regex(uuidRegex, "Invalid UUID"),
  npcId: z.number().int().positive(),
});
export type StartNpcBattleDto = z.infer<typeof startNpcBattleBody>;

export const battleTurnAttackBody = z.object({
  moveId: z.number().int().positive(),
});
export type BattleTurnAttackDto = z.infer<typeof battleTurnAttackBody>;
export type BattleAttackDto = BattleTurnAttackDto;
export const attackTurnBody = battleTurnAttackBody;
export type AttackTurnDto = BattleTurnAttackDto;

export const battleTurnSwitchBody = z.object({
  partyPosition: z.number().int().min(1).max(6),
});
export type BattleTurnSwitchDto = z.infer<typeof battleTurnSwitchBody>;
export type BattleSwitchDto = BattleTurnSwitchDto;
export const switchTurnBody = battleTurnSwitchBody;
export type SwitchTurnDto = BattleTurnSwitchDto;

export const battleTurnItemBody = z.object({
  itemId: z.number().int().positive(),
  targetPartyPosition: z.number().int().min(1).max(6).optional(),
});
export type BattleTurnItemDto = z.infer<typeof battleTurnItemBody>;
export type BattleItemDto = BattleTurnItemDto;
export const itemTurnBody = battleTurnItemBody;
export type ItemTurnDto = BattleTurnItemDto;

export const listCatchHistoryQuery = paginationQuery.extend({
  outcome: z.enum(["caught", "missed"]).optional(),
  caught: z.coerce.boolean().optional(),
  speciesId: z.coerce.number().int().positive().optional(),
});
export type ListCatchHistoryQuery = z.infer<typeof listCatchHistoryQuery>;