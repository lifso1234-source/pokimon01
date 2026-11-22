import { AppDataSource } from "../data-source";
import { Creature, HotbarSlot, Inventory, Item, NpcShopItem, Player } from "../entity";
import { AppError } from "../utils/AppError";
import { SetHotbarDto, ShopTradeDto, UseItemDto } from "../validators/inventory.validators";
import { calcMaxHp } from "./player.service";

export const inventoryService = {
  async getInventory(playerId: string) {
    return AppDataSource.getRepository(Inventory).find({
      where: { playerId },
      relations: { item: true },
    });
  },

  async getHotbar(playerId: string) {
    return AppDataSource.getRepository(HotbarSlot).find({
      where: { playerId },
      relations: { item: true },
      order: { slot: "ASC" },
    });
  },

  async setHotbarSlot(playerId: string, slot: number, dto: SetHotbarDto) {
    const owned = await AppDataSource.getRepository(Inventory).findOneBy({ playerId, itemId: dto.itemId });
    if (!owned) throw new AppError(400, "ITEM_NOT_OWNED", "You can only assign owned items to the hotbar");

    const repo = AppDataSource.getRepository(HotbarSlot);
    await repo.delete({ playerId, itemId: dto.itemId }); // enforce unique(player_id, item_id)
    const entry = repo.create({ playerId, slot, itemId: dto.itemId });
    await repo.save(entry);
    return this.getHotbar(playerId);
  },

  async clearHotbarSlot(playerId: string, slot: number) {
    await AppDataSource.getRepository(HotbarSlot).delete({ playerId, slot });
  },

  async useItem(playerId: string, dto: UseItemDto) {
    return AppDataSource.transaction(async (manager) => {
      const inv = await manager.findOne(Inventory, {
        where: { playerId, itemId: dto.itemId },
        relations: { item: true },
      });
      if (!inv || !inv.item) throw new AppError(400, "ITEM_NOT_OWNED", "Item not in inventory");

      const creature = await manager.findOne(Creature, {
        where: { id: dto.creatureId, ownerId: playerId },
        relations: { species: true },
      });
      if (!creature || !creature.species) throw new AppError(404, "NOT_FOUND", "Target creature not found");

      const healHp = Number(inv.item.effect?.heal_hp ?? 0);
      if (healHp <= 0) throw new AppError(400, "UNUSABLE_ITEM", "Item cannot be used on a creature outside battle");

      const maxHp = calcMaxHp(creature.species.baseHp, creature.level);
      if (creature.currentHp >= maxHp) throw new AppError(400, "FULL_HP", "Creature is already at full HP");

      creature.currentHp = Math.min(maxHp, creature.currentHp + healHp);
      await manager.save(creature);

      if (inv.quantity === 1) await manager.remove(inv);
      else {
        inv.quantity -= 1;
        await manager.save(inv);
      }

      return { creatureId: creature.id, currentHp: creature.currentHp, maxHp };
    });
  },

  async getNpcShop(npcId: number) {
    return AppDataSource.getRepository(NpcShopItem).find({
      where: { npcId },
      relations: { item: true },
    });
  },

  async buyFromNpc(npcId: number, dto: ShopTradeDto) {
    return AppDataSource.transaction(async (manager) => {
      const listing = await manager.findOne(NpcShopItem, {
        where: { npcId, itemId: dto.itemId },
        relations: { item: true },
      });
      if (!listing) throw new AppError(404, "NOT_SOLD_HERE", "NPC does not sell this item");

      const player = await manager.findOneBy(Player, { id: dto.playerId });
      if (!player) throw new AppError(404, "NOT_FOUND", "Player not found");

      const totalCost = listing.price * dto.quantity;
      if (player.money < totalCost) throw new AppError(400, "INSUFFICIENT_FUNDS", "Not enough money");

      player.money -= totalCost;
      await manager.save(player);

      let inv = await manager.findOneBy(Inventory, { playerId: player.id, itemId: dto.itemId });
      if (inv) {
        inv.quantity += dto.quantity;
      } else {
        inv = manager.create(Inventory, { playerId: player.id, itemId: dto.itemId, quantity: dto.quantity });
      }
      await manager.save(inv);

      return { money: player.money, itemId: dto.itemId, quantity: inv.quantity };
    });
  },

  async sellToNpc(npcId: number, dto: ShopTradeDto) {
    return AppDataSource.transaction(async (manager) => {
      await manager.findOneByOrFail(NpcShopItem, { npcId, itemId: dto.itemId }).catch(() => {
        throw new AppError(404, "NOT_TRADED_HERE", "Shop does not deal in this item");
      });

      const inv = await manager.findOne(Inventory, {
        where: { playerId: dto.playerId, itemId: dto.itemId },
        relations: { item: true },
      });
      if (!inv || inv.quantity < dto.quantity) {
        throw new AppError(400, "INSUFFICIENT_ITEMS", "Not enough items to sell");
      }

      const item = await manager.findOneByOrFail(Item, { id: dto.itemId });
      if (item.sellPrice === null) throw new AppError(400, "UNSELLABLE", "This item cannot be sold");

      const player = await manager.findOneByOrFail(Player, { id: dto.playerId });
      player.money += item.sellPrice * dto.quantity;
      await manager.save(player);

      if (inv.quantity === dto.quantity) {
        await manager.remove(inv);
      } else {
        inv.quantity -= dto.quantity;
        await manager.save(inv);
      }

      return { money: player.money, itemId: dto.itemId, remaining: Math.max(0, inv.quantity - dto.quantity) };
    });
  },
};
