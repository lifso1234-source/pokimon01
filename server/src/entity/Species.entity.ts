import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { CREATURE_TYPES, CreatureType } from './enums';
import { SpeciesMove } from './SpeciesMove.entity';
import { Evolution } from './Evolution.entity';

@Entity({ name: 'species', schema: 'poke' })
export class Species {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ name: 'dex_number', type: 'int', unique: true })
  dexNumber!: number;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'enum', enum: CREATURE_TYPES, enumName: 'creature_type' })
  type1!: CreatureType;

  @Column({ type: 'enum', enum: CREATURE_TYPES, enumName: 'creature_type', nullable: true })
  type2!: CreatureType | null;

  @Column({ name: 'base_hp', type: 'smallint' })
  baseHp!: number;

  @Column({ name: 'base_attack', type: 'smallint' })
  baseAttack!: number;

  @Column({ name: 'base_defense', type: 'smallint' })
  baseDefense!: number;

  @Column({ name: 'base_sp_attack', type: 'smallint' })
  baseSpAttack!: number;

  @Column({ name: 'base_sp_defense', type: 'smallint' })
  baseSpDefense!: number;

  @Column({ name: 'base_speed', type: 'smallint' })
  baseSpeed!: number;

  @Column({ name: 'catch_rate', type: 'smallint', default: 45 })
  catchRate!: number;

  @Column({ name: 'base_exp_yield', type: 'smallint', default: 64 })
  baseExpYield!: number;

  @Column({ name: 'sprite_url', type: 'text', nullable: true })
  spriteUrl!: string | null;

  @OneToMany(() => SpeciesMove, (sm) => sm.species, { cascade: true })
  speciesMoves?: Relation<SpeciesMove[]>;

  @OneToMany(() => Evolution, (ev) => ev.fromSpecies)
  evolutionsFrom?: Relation<Evolution[]>;
}
