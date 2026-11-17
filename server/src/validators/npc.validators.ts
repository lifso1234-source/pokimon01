import { z } from "zod";
import { paginationQuery } from "../utils/pagination";

export const listNpcsQuery = paginationQuery.extend({
  role: z.enum(["trainer", "healer", "shopkeeper", "villager"]).optional(),
  q: z.string().optional(),
});
export type ListNpcsQuery = z.infer<typeof listNpcsQuery>;

export const createNpcBody = z.object({
  name: z.string().min(1).max(60),
  role: z.enum(["trainer", "healer", "shopkeeper", "villager"]),
  posX: z.number().int().nullable().optional(),
  posY: z.number().int().nullable().optional(),
  facing: z.enum(["up", "down", "left", "right"]).default("down"),
  sightRange: z.number().int().min(0).max(15).default(0),
  dialogue: z.record(z.string(), z.unknown()).default({}),
  rewardMoney: z.number().int().min(0).default(0),
  canRebattle: z.boolean().default(false),
});
export type CreateNpcDto = z.infer<typeof createNpcBody>;

export const updateNpcBody = createNpcBody.partial();
export type UpdateNpcDto = z.infer<typeof updateNpcBody>;