import { z } from "zod";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const useItemBody = z.object({
  itemId: z.number().int().positive(),
  creatureId: z.string().regex(uuidRegex, "Invalid UUID"),
});
export type UseItemDto = z.infer<typeof useItemBody>;

export const hotbarSlotParam = z.object({
  id: z.string().regex(uuidRegex, "Invalid UUID"),
  slot: z.coerce.number().int().min(1).max(9),
});
export type HotbarSlotParam = z.infer<typeof hotbarSlotParam>;

export const setHotbarBody = z.object({
  itemId: z.number().int().positive(),
});
export type SetHotbarDto = z.infer<typeof setHotbarBody>;

export const shopTradeBody = z.object({
  playerId: z.string().regex(uuidRegex, "Invalid UUID"),
  itemId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});
export type ShopTradeDto = z.infer<typeof shopTradeBody>;
