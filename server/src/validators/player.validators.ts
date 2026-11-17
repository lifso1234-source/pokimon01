import { z } from "zod";
import { paginationQuery } from "../utils/pagination";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidParam = z.object({ id: z.string().regex(uuidRegex, "Invalid UUID") });
export const playerIdParam = z.object({ playerId: z.string().regex(uuidRegex, "Invalid UUID") });
export type UuidParam = z.infer<typeof uuidParam>;
export type PlayerIdParam = z.infer<typeof playerIdParam>;

export const registerBody = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(24),
  password: z.string().min(4),
  trainerName: z.string().min(1).max(40),
  starterSpeciesId: z.number().int().positive().default(1),
});
export type RegisterDto = z.infer<typeof registerBody>;

export const loginBody = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginBody>;

export const updatePlayerBody = z.object({
  trainerName: z.string().min(1).max(40).optional(),
  email: z.string().email().optional(),
});
export type UpdatePlayerDto = z.infer<typeof updatePlayerBody>;

export const listPlayersQuery = paginationQuery.extend({
  q: z.string().optional(),
});
export type ListPlayersQuery = z.infer<typeof listPlayersQuery>;

export const movePlayerBody = z.object({
  x: z.number().int(),
  y: z.number().int(),
});
export type MovePlayerDto = z.infer<typeof movePlayerBody>;