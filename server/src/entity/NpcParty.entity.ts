import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { Npc } from './Npc.entity';
import { Species } from './Species.entity';

@Entity({ name: 'npc_party', schema: 'poke' })
export class NpcParty {
  @PrimaryColumn({ name: 'npc_id', type: 'int' })
  npcId!: number;

  @PrimaryColumn({ type: 'smallint' })
  slot!: number;

  @Column({ name: 'species_id', type: 'int' })
  speciesId!: number;

  @Column({ type: 'smallint' })
  level!: number;

  @ManyToOne(() => Npc, (npc) => npc.party, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'npc_id' })
  npc?: Relation<Npc>;

  @ManyToOne(() => Species, { nullable: false })
  @JoinColumn({ name: 'species_id' })
  species?: Relation<Species>;
}
