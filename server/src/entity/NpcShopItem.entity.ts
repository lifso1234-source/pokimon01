import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { Npc } from './Npc.entity';
import { Item } from './Item.entity';

@Entity({ name: 'npc_shop_items', schema: 'poke' })
export class NpcShopItem {
  @PrimaryColumn({ name: 'npc_id', type: 'int' })
  npcId!: number;

  @PrimaryColumn({ name: 'item_id', type: 'int' })
  itemId!: number;

  @Column({ type: 'int' })
  price!: number;

  @ManyToOne(() => Npc, (npc) => npc.shopItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'npc_id' })
  npc?: Relation<Npc>;

  @ManyToOne(() => Item, { nullable: false })
  @JoinColumn({ name: 'item_id' })
  item?: Relation<Item>;
}
