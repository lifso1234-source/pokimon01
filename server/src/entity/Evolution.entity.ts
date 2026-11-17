import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { Species } from './Species.entity';
import { Item } from './Item.entity';

@Entity({ name: 'evolutions', schema: 'poke' })
export class Evolution {
  @PrimaryColumn({ name: 'from_species_id', type: 'int' })
  fromSpeciesId!: number;

  @PrimaryColumn({ name: 'to_species_id', type: 'int' })
  toSpeciesId!: number;

  @Column({ name: 'min_level', type: 'smallint', nullable: true })
  minLevel!: number | null;

  @Column({ name: 'item_id', type: 'int', nullable: true })
  itemId!: number | null;

  @ManyToOne(() => Species, (species) => species.evolutionsFrom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_species_id' })
  fromSpecies?: Relation<Species>;

  @ManyToOne(() => Species, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_species_id' })
  toSpecies?: Relation<Species>;

  @ManyToOne(() => Item, { nullable: true })
  @JoinColumn({ name: 'item_id' })
  item?: Relation<Item> | null;
}
