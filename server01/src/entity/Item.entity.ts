import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ITEM_CATEGORIES, ItemCategory } from './enums';
import { Move } from './Move.entity';

@Entity({ name: 'items', schema: 'poke' })
export class Item {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'enum', enum: ITEM_CATEGORIES, enumName: 'item_category' })
  category!: ItemCategory;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ name: 'buy_price', type: 'int', nullable: true })
  buyPrice!: number | null;

  @Column({ name: 'sell_price', type: 'int', nullable: true })
  sellPrice!: number | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  effect!: Record<string, unknown>;

  @Column({ name: 'teaches_move_id', type: 'int', nullable: true })
  teachesMoveId!: number | null;

  @Column({ name: 'icon_url', type: 'text', nullable: true })
  iconUrl!: string | null;

  @ManyToOne(() => Move, { nullable: true })
  @JoinColumn({ name: 'teaches_move_id' })
  teachesMove?: Relation<Move> | null;
}
