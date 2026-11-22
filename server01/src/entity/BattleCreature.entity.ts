import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { STATUS_CONDITIONS, StatusCondition } from './enums';
import { Battle } from './Battle.entity';
import { Creature } from './Creature.entity';
import { Species } from './Species.entity';

@Entity({ name: 'battle_creatures', schema: 'poke' })
export class BattleCreature {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'battle_id', type: 'uuid' })
  battleId!: string;

  @Column({ type: 'smallint' })
  side!: number;

  @Column({ name: 'party_position', type: 'smallint' })
  partyPosition!: number;

  @Column({ name: 'creature_id', type: 'uuid', nullable: true })
  creatureId!: string | null;

  @Column({ name: 'species_id', type: 'int' })
  speciesId!: number;

  @Column({ type: 'smallint' })
  level!: number;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ name: 'max_hp', type: 'int' })
  maxHp!: number;

  @Column({ name: 'current_hp', type: 'int' })
  currentHp!: number;

  @Column({ type: 'enum', enum: STATUS_CONDITIONS, enumName: 'status_condition', default: 'none' })
  status!: StatusCondition;

  @Column({ name: 'stat_stages', type: 'jsonb', default: () => "'{}'::jsonb" })
  statStages!: Record<string, number>;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  moves!: Array<{ move_id: number; pp: number }>;

  @ManyToOne(() => Battle, (battle) => battle.creatures, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'battle_id' })
  battle?: Relation<Battle>;

  @ManyToOne(() => Creature, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creature_id' })
  creature?: Relation<Creature> | null;

  @ManyToOne(() => Species, { nullable: false })
  @JoinColumn({ name: 'species_id' })
  species?: Relation<Species>;
}
