import { Column, Entity, PrimaryColumn } from 'typeorm';
import { TERRAINS, Terrain } from './enums';

@Entity({ name: 'map_tiles', schema: 'poke' })
export class MapTile {
  @PrimaryColumn({ type: 'int' })
  x!: number;

  @PrimaryColumn({ type: 'int' })
  y!: number;

  @Column({ type: 'enum', enum: TERRAINS, enumName: 'terrain' })
  terrain!: Terrain;

  @Column({ name: 'is_walkable', type: 'boolean', default: true })
  isWalkable!: boolean;
}
