import { Column, Entity, PrimaryColumn } from 'typeorm';
import { CREATURE_TYPES, CreatureType } from './enums';
import { numericTransformer } from './transformers';

@Entity({ name: 'type_effectiveness', schema: 'poke' })
export class TypeEffectiveness {
  @PrimaryColumn({ type: 'enum', enum: CREATURE_TYPES, enumName: 'creature_type' })
  attacking!: CreatureType;

  @PrimaryColumn({ type: 'enum', enum: CREATURE_TYPES, enumName: 'creature_type' })
  defending!: CreatureType;

  @Column({ type: 'numeric', precision: 3, scale: 2, transformer: numericTransformer })
  multiplier!: number;
}
