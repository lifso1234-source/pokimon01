import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { STATUS_CONDITIONS, StatusCondition } from './enums';
import { Player } from './Player.entity';
import { Species } from './Species.entity';
import { CreatureMove } from './CreatureMove.entity';
import { numericTransformer } from './transformers';

@Entity({ name: 'creatures', schema: 'poke' })
export class Creature {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ name: 'species_id', type: 'int' })
  speciesId!: number;

  @Column({ type: 'text', nullable: true })
  nickname!: string | null;

  @Column({ type: 'smallint', default: 1 })
  level!: number;

  @Column({ type: 'bigint', default: 0, transformer: numericTransformer })
  experience!: number;

  @Column({ name: 'current_hp', type: 'int' })
  currentHp!: number;

  @Column({ type: 'enum', enum: STATUS_CONDITIONS, enumName: 'status_condition', default: 'none' })
  status!: StatusCondition;

  @Column({ name: 'party_slot', type: 'smallint', nullable: true })
  partySlot!: number | null;

  @Column({ name: 'storage_slot', type: 'smallint', nullable: true })
  storageSlot!: number | null;

  @CreateDateColumn({ name: 'caught_at', type: 'timestamptz' })
  caughtAt!: Date;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt!: Date | null;

  @ManyToOne(() => Player, (player) => player.creatures, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: Relation<Player>;

  @ManyToOne(() => Species, { nullable: false })
  @JoinColumn({ name: 'species_id' })
  species?: Relation<Species>;

  @OneToMany(() => CreatureMove, (cm) => cm.creature, { cascade: true })
  moves?: Relation<CreatureMove[]>;
}
