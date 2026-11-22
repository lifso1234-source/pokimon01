import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { NPC_ROLES, NpcFacing, NpcRole } from './enums';
import { MapTile } from './MapTile.entity';
import { NpcParty } from './NpcParty.entity';
import { NpcShopItem } from './NpcShopItem.entity';

@Entity({ name: 'npcs', schema: 'poke' })
export class Npc {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'enum', enum: NPC_ROLES, enumName: 'npc_role', default: 'generic' })
  role!: NpcRole;

  @Column({ name: 'sprite_url', type: 'text', nullable: true })
  spriteUrl!: string | null;

  @Column({ name: 'pos_x', type: 'int', nullable: true })
  posX!: number | null;

  @Column({ name: 'pos_y', type: 'int', nullable: true })
  posY!: number | null;

  @Column({ type: 'text', default: 'down' })
  facing!: NpcFacing;

  @Column({ name: 'sight_range', type: 'smallint', default: 0 })
  sightRange!: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  dialogue!: Record<string, unknown>;

  @Column({ name: 'reward_money', type: 'int', default: 0 })
  rewardMoney!: number;

  @Column({ name: 'can_rebattle', type: 'boolean', default: false })
  canRebattle!: boolean;

  @ManyToOne(() => MapTile, { nullable: true })
  @JoinColumn([
    { name: 'pos_x', referencedColumnName: 'x' },
    { name: 'pos_y', referencedColumnName: 'y' },
  ])
  tile?: Relation<MapTile> | null;

  @OneToMany(() => NpcParty, (party) => party.npc, { cascade: true })
  party?: Relation<NpcParty[]>;

  @OneToMany(() => NpcShopItem, (shopItem) => shopItem.npc, { cascade: true })
  shopItems?: Relation<NpcShopItem[]>;
}
