import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { CATCH_OUTCOMES, CatchOutcome, MissReason } from './enums';
import { Player } from './Player.entity';
import { Species } from './Species.entity';
import { Item } from './Item.entity';
import { Creature } from './Creature.entity';
import { Battle } from './Battle.entity';

@Entity({ name: 'catch_history', schema: 'poke' })
export class CatchHistory {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id!: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId!: string;

  @Column({ name: 'species_id', type: 'int' })
  speciesId!: number;

  @Column({ name: 'wild_level', type: 'smallint' })
  wildLevel!: number;

  @Column({ type: 'enum', enum: CATCH_OUTCOMES, enumName: 'catch_outcome' })
  outcome!: CatchOutcome;

  @Column({ name: 'miss_reason', type: 'text', nullable: true })
  missReason!: MissReason | null;

  @Column({ name: 'balls_thrown', type: 'smallint', default: 0 })
  ballsThrown!: number;

  @Column({ name: 'ball_item_id', type: 'int', nullable: true })
  ballItemId!: number | null;

  @Column({ name: 'creature_id', type: 'uuid', nullable: true })
  creatureId!: string | null;

  @Column({ name: 'battle_id', type: 'uuid', nullable: true })
  battleId!: string | null;

  @Column({ name: 'pos_x', type: 'int', nullable: true })
  posX!: number | null;

  @Column({ name: 'pos_y', type: 'int', nullable: true })
  posY!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player?: Relation<Player>;

  @ManyToOne(() => Species, { nullable: false })
  @JoinColumn({ name: 'species_id' })
  species?: Relation<Species>;

  @ManyToOne(() => Item, { nullable: true })
  @JoinColumn({ name: 'ball_item_id' })
  ballItem?: Relation<Item> | null;

  @ManyToOne(() => Creature, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creature_id' })
  creature?: Relation<Creature> | null;

  @ManyToOne(() => Battle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'battle_id' })
  battle?: Relation<Battle> | null;
}
