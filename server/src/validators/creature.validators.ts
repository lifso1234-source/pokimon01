import { z } from "zod";
import { paginationQuery } from "../utils/pagination";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const creatureIdParam = z.object({ id: z.string().regex(uuidRegex, "Invalid UUID") });
export type CreatureIdParam = z.infer<typeof creatureIdParam>;

export const listPlayerCreaturesQuery = paginationQuery.extend({
  location: z.enum(["party", "storage", "all"]).default("all"),
});
export type ListPlayerCreaturesQuery = z.infer<typeof listPlayerCreaturesQuery>;

export const updateCreatureBody = z.object({
  nickname: z.string().max(32).nullable().optional(),
  partySlot: z.number().int().min(1).max(6).nullable().optional(),
  storageSlot: z.number().int().positive().nullable().optional(),
});
export type UpdateCreatureDto = z.infer<typeof updateCreatureBody>;

export const learnMoveBody = z.object({
  slot: z.number().int().min(1).max(4),
  moveId: z.number().int().positive(),
});
export type LearnMoveDto = z.infer<typeof learnMoveBody>;

export const setCreatureMoveBody = learnMoveBody;
export type SetCreatureMoveDto = LearnMoveDto;

export const evolveCreatureBody = z.object({
  toSpeciesId: z.number().int().positive(),
  itemId: z.number().int().positive().optional(),
});
export type EvolveCreatureDto = z.infer<typeof evolveCreatureBody>;