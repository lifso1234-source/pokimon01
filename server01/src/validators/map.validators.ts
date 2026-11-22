import { z } from "zod";
import { paginationQuery } from "../utils/pagination";

const terrainEnum = z.enum(["grass", "water", "sand", "cave", "path", "wall", "building", "tree", "snow", "wheat", "mountain", "deep water"]);

export const listTilesQuery = paginationQuery.extend({
  limit: z.coerce.number().int().min(1).max(2000).default(500),
  terrain: terrainEnum.optional(),
  isWalkable: z.coerce.boolean().optional(),
});
export type ListTilesQuery = z.infer<typeof listTilesQuery>;

export const upsertTileBody = z.object({
  x: z.number().int(),
  y: z.number().int(),
  terrain: terrainEnum,
  isWalkable: z.boolean(),
});
export type UpsertTileDto = z.infer<typeof upsertTileBody>;

export const tileCoordParam = z.object({
  x: z.coerce.number().int(),
  y: z.coerce.number().int(),
});
export type TileCoordParam = z.infer<typeof tileCoordParam>;

export const listEncountersQuery = paginationQuery.extend({
  terrain: terrainEnum.optional(),
  speciesId: z.coerce.number().int().positive().optional(),
});
export type ListEncountersQuery = z.infer<typeof listEncountersQuery>;

export const createEncounterBody = z.object({
  terrain: terrainEnum,
  speciesId: z.number().int().positive(),
  minLevel: z.number().int().min(1).max(100),
  maxLevel: z.number().int().min(1).max(100),
  weight: z.number().int().positive().default(10),
});
export type CreateEncounterDto = z.infer<typeof createEncounterBody>;

export const updateEncounterBody = createEncounterBody.partial();
export type UpdateEncounterDto = z.infer<typeof updateEncounterBody>;