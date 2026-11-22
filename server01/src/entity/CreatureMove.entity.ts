import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { Creature } from './Creature.entity';
import { Move } from './Move.entity';

@Entity({ name: 'creature_moves', schema: 'poke' })
export class CreatureMove {
  @PrimaryColumn({ name: 'creature_id', type: 'uuid' })
  creatureId!: string;

  @PrimaryColumn({ type: 'smallint' })
  slot!: number;

  @Column({ name: 'move_id', type: 'int' })
  moveId!: number;

  @Column({ name: 'current_pp', type: 'smallint' })
  currentPp!: number;

  @ManyToOne(() => Creature, (creature) => creature.moves, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creature_id' })
  creature?: Relation<Creature>;

  @ManyToOne(() => Move, { nullable: false })
  @JoinColumn({ name: 'move_id' })
  move?: Relation<Move>;
}
