import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { Player } from './Player.entity';
import { Item } from './Item.entity';
import { Inventory } from './Inventory.entity';

@Entity({ name: 'hotbar_slots', schema: 'poke' })
export class HotbarSlot {
  @PrimaryColumn({ name: 'player_id', type: 'uuid' })
  playerId!: string;

  @PrimaryColumn({ type: 'smallint' })
  slot!: number;

  @Column({ name: 'item_id', type: 'int' })
  itemId!: number;

  @ManyToOne(() => Player, (player) => player.hotbarSlots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player?: Relation<Player>;

  @ManyToOne(() => Item, { nullable: false })
  @JoinColumn({ name: 'item_id' })
  item?: Relation<Item>;

  @ManyToOne(() => Inventory, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'player_id', referencedColumnName: 'playerId' },
    { name: 'item_id', referencedColumnName: 'itemId' },
  ])
  inventoryEntry?: Relation<Inventory>;
}
