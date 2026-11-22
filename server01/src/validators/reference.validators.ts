import { z } from "zod";
import {
  CREATURE_TYPES,
  CreatureType,
  ITEM_CATEGORIES,
  ItemCategory,
  MOVE_CATEGORIES,
  MoveCategory,
} from "../entity";
import { paginationQuery } from "../utils/pagination";

const typeEnum = z.enum([...CREATURE_TYPES] as [CreatureType, ...CreatureType[]]);
const moveCatEnum = z.enum([...MOVE_CATEGORIES] as [MoveCategory, ...MoveCategory[]]);
const itemCatEnum = z.enum([...ITEM_CATEGORIES] as [ItemCategory, ...ItemCategory[]]);

export const listSpeciesQuery = paginationQuery.extend({
  q: z.string().optional(),
  type: typeEnum.optional(),
});
export type ListSpeciesQuery = z.infer<typeof listSpeciesQuery>;

export const createSpeciesBody = z.object({
  dexNumber: z.number().int().positive(),
  name: z.string().min(1),
  type1: typeEnum,
  type2: typeEnum.nullable().optional(),
  baseHp: z.number().int().min(1).max(255),
  baseAttack: z.number().int().min(1).max(255),
  baseDefense: z.number().int().min(1).max(255),
  baseSpAttack: z.number().int().min(1).max(255),
  baseSpDefense: z.number().int().min(1).max(255),
  baseSpeed: z.number().int().min(1).max(255),
  catchRate: z.number().int().min(1).max(255).default(45),
  baseExpYield: z.number().int().positive().default(64),
  spriteUrl: z.string().nullable().optional(),
});
export type CreateSpeciesDto = z.infer<typeof createSpeciesBody>;
export const updateSpeciesBody = createSpeciesBody.partial();
export type UpdateSpeciesDto = z.infer<typeof updateSpeciesBody>;

export const listMovesQuery = paginationQuery.extend({
  q: z.string().optional(),
  type: typeEnum.optional(),
  category: moveCatEnum.optional(),
});
export type ListMovesQuery = z.infer<typeof listMovesQuery>;

export const createMoveBody = z.object({
  name: z.string().min(1),
  type: typeEnum,
  category: moveCatEnum,
  power: z.number().int().min(0).max(250).nullable().optional(),
  accuracy: z.number().int().min(1).max(100).nullable().optional(),
  maxPp: z.number().int().min(1).max(64),
  effect: z.record(z.string(), z.unknown()).default({}),
});
export type CreateMoveDto = z.infer<typeof createMoveBody>;
export const updateMoveBody = createMoveBody.partial();
export type UpdateMoveDto = z.infer<typeof updateMoveBody>;

export const listItemsQuery = paginationQuery.extend({
  q: z.string().optional(),
  category: itemCatEnum.optional(),
});
export type ListItemsQuery = z.infer<typeof listItemsQuery>;

export const createItemBody = z.object({
  name: z.string().min(1),
  category: itemCatEnum,
  description: z.string().default(""),
  buyPrice: z.number().int().min(0).nullable().optional(),
  sellPrice: z.number().int().min(0).nullable().optional(),
  effect: z.record(z.string(), z.unknown()).default({}),
  teachesMoveId: z.number().int().positive().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
});
export type CreateItemDto = z.infer<typeof createItemBody>;
export const updateItemBody = createItemBody.partial();
export type UpdateItemDto = z.infer<typeof updateItemBody>;