import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { Species } from './Species.entity';
import { Move } from './Move.entity';

@Entity({ name: 'species_moves', schema: 'poke' })
export class SpeciesMove {
  @PrimaryColumn({ name: 'species_id', type: 'int' })
  speciesId!: number;

  @PrimaryColumn({ name: 'move_id', type: 'int' })
  moveId!: number;

  @Column({ type: 'smallint' })
  level!: number;

  @ManyToOne(() => Species, (species) => species.speciesMoves, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'species_id' })
  species?: Relation<Species>;

  @ManyToOne(() => Move, (move) => move.speciesMoves)
  @JoinColumn({ name: 'move_id' })
  move?: Relation<Move>;
}
