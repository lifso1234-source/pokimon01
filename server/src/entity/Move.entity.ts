import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { CREATURE_TYPES, CreatureType, MOVE_CATEGORIES, MoveCategory } from './enums';
import { SpeciesMove } from './SpeciesMove.entity';

@Entity({ name: 'moves', schema: 'poke' })
export class Move {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'enum', enum: CREATURE_TYPES, enumName: 'creature_type' })
  type!: CreatureType;

  @Column({ type: 'enum', enum: MOVE_CATEGORIES, enumName: 'move_category' })
  category!: MoveCategory;

  @Column({ type: 'smallint', nullable: true })
  power!: number | null;

  @Column({ type: 'smallint', nullable: true })
  accuracy!: number | null;

  @Column({ name: 'max_pp', type: 'smallint' })
  maxPp!: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  effect!: Record<string, unknown>;

  @OneToMany(() => SpeciesMove, (sm) => sm.move)
  speciesMoves?: Relation<SpeciesMove[]>;
}
