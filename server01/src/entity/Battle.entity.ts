import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { BATTLE_KINDS, BATTLE_STATUSES, BattleKind, BattleStatus } from './enums';
import { Player } from './Player.entity';
import { Npc } from './Npc.entity';
import { BattleCreature } from './BattleCreature.entity';

@Entity({ name: 'battles', schema: 'poke' })
export class Battle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId!: string;

  @Column({ type: 'enum', enum: BATTLE_KINDS, enumName: 'battle_kind' })
  kind!: BattleKind;

  @Column({ name: 'npc_id', type: 'int', nullable: true })
  npcId!: number | null;

  @Column({ type: 'enum', enum: BATTLE_STATUSES, enumName: 'battle_status', default: 'active' })
  status!: BattleStatus;

  @Column({ name: 'turn_number', type: 'int', default: 0 })
  turnNumber!: number;

  @Column({ name: 'pos_x', type: 'int', nullable: true })
  posX!: number | null;

  @Column({ name: 'pos_y', type: 'int', nullable: true })
  posY!: number | null;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @ManyToOne(() => Player, (player) => player.battles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player?: Relation<Player>;

  @ManyToOne(() => Npc, { nullable: true })
  @JoinColumn({ name: 'npc_id' })
  npc?: Relation<Npc> | null;

  @OneToMany(() => BattleCreature, (bc) => bc.battle, { cascade: true })
  creatures?: Relation<BattleCreature[]>;
}
