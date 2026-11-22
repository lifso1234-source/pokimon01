import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { TERRAINS, Terrain } from './enums';
import { Species } from './Species.entity';

@Entity({ name: 'encounters', schema: 'poke' })
export class Encounter {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ type: 'enum', enum: TERRAINS, enumName: 'terrain' })
  terrain!: Terrain;

  @Column({ name: 'species_id', type: 'int' })
  speciesId!: number;

  @Column({ name: 'min_level', type: 'smallint' })
  minLevel!: number;

  @Column({ name: 'max_level', type: 'smallint' })
  maxLevel!: number;

  @Column({ type: 'smallint', default: 10 })
  weight!: number;

  @ManyToOne(() => Species, { nullable: false })
  @JoinColumn({ name: 'species_id' })
  species?: Relation<Species>;
}
