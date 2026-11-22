import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { Player } from './Player.entity';
import { Item } from './Item.entity';

@Entity({ name: 'inventory', schema: 'poke' })
export class Inventory {
  @PrimaryColumn({ name: 'player_id', type: 'uuid' })
  playerId!: string;

  @PrimaryColumn({ name: 'item_id', type: 'int' })
  itemId!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @ManyToOne(() => Player, (player) => player.inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player?: Relation<Player>;

  @ManyToOne(() => Item, { nullable: false })
  @JoinColumn({ name: 'item_id' })
  item?: Relation<Item>;
}
