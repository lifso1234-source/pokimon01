import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { Player } from './Player.entity';
import { Npc } from './Npc.entity';

@Entity({ name: 'player_npc_defeats', schema: 'poke' })
export class PlayerNpcDefeat {
  @PrimaryColumn({ name: 'player_id', type: 'uuid' })
  playerId!: string;

  @PrimaryColumn({ name: 'npc_id', type: 'int' })
  npcId!: number;

  @Column({ name: 'times_defeated', type: 'int', default: 1 })
  timesDefeated!: number;

  @Column({ name: 'last_defeated_at', type: 'timestamptz', default: () => 'now()' })
  lastDefeatedAt!: Date;

  @ManyToOne(() => Player, (player) => player.npcDefeats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player?: Relation<Player>;

  @ManyToOne(() => Npc, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'npc_id' })
  npc?: Relation<Npc>;
}
