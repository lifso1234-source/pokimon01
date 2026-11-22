import { ViewColumn, ViewEntity } from 'typeorm';
import { numericTransformer } from './transformers';

@ViewEntity({ name: 'player_catch_stats', schema: 'poke', synchronize: false })
export class PlayerCatchStat {
  @ViewColumn({ name: 'player_id' })
  playerId!: string;

  @ViewColumn({ name: 'species_id' })
  speciesId!: number;

  @ViewColumn({ name: 'times_caught', transformer: numericTransformer })
  timesCaught!: number;

  @ViewColumn({ name: 'times_missed', transformer: numericTransformer })
  timesMissed!: number;

  @ViewColumn({ transformer: numericTransformer })
  encounters!: number;

  @ViewColumn({ name: 'first_seen_at' })
  firstSeenAt!: Date;
}
