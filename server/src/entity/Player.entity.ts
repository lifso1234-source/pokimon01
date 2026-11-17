import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { MapTile } from './MapTile.entity';
import { Creature } from './Creature.entity';
import { Inventory } from './Inventory.entity';
import { HotbarSlot } from './HotbarSlot.entity';
import { Battle } from './Battle.entity';
import { PlayerNpcDefeat } from './PlayerNpcDefeat.entity';
import { numericTransformer } from './transformers';

@Entity({ name: 'players', schema: 'poke' })
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'citext', unique: true })
  email!: string;

  @Column({ type: 'citext', unique: true })
  username!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ name: 'trainer_name', type: 'text' })
  trainerName!: string;

  @Column({ type: 'bigint', default: 3000, transformer: numericTransformer })
  money!: number;

  @Column({ name: 'pos_x', type: 'int' })
  posX!: number;

  @Column({ name: 'pos_y', type: 'int' })
  posY!: number;

  @Column({ name: 'respawn_x', type: 'int', nullable: true })
  respawnX!: number | null;

  @Column({ name: 'respawn_y', type: 'int', nullable: true })
  respawnY!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @ManyToOne(() => MapTile, { nullable: false })
  @JoinColumn([
    { name: 'pos_x', referencedColumnName: 'x' },
    { name: 'pos_y', referencedColumnName: 'y' },
  ])
  tile?: Relation<MapTile>;

  @ManyToOne(() => MapTile, { nullable: true })
  @JoinColumn([
    { name: 'respawn_x', referencedColumnName: 'x' },
    { name: 'respawn_y', referencedColumnName: 'y' },
  ])
  respawnTile?: Relation<MapTile> | null;

  @OneToMany(() => Creature, (creature) => creature.owner, { cascade: true })
  creatures?: Relation<Creature[]>;

  @OneToMany(() => Inventory, (inv) => inv.player, { cascade: true })
  inventory?: Relation<Inventory[]>;

  @OneToMany(() => HotbarSlot, (slot) => slot.player, { cascade: true })
  hotbarSlots?: Relation<HotbarSlot[]>;

  @OneToMany(() => PlayerNpcDefeat, (defeat) => defeat.player, { cascade: true })
  npcDefeats?: Relation<PlayerNpcDefeat[]>;

  @OneToMany(() => Battle, (battle) => battle.player)
  battles?: Relation<Battle[]>;
}
