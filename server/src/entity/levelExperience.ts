import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'poke', name: 'level_experience' })
@Check(`"level" BETWEEN 1 AND 100`)
@Check(`"total_experience" >= 0`)
@Check(`"exp_to_next_level" > 0`)
@Check(`("level" = 100) = ("exp_to_next_level" IS NULL)`)
export class LevelExperience {
  @PrimaryColumn({ type: 'smallint' })
  level!: number;

  @Column({
    name: 'total_experience',
    type: 'bigint',
    transformer: {
      to: (value: number | string) => value,
      from: (value: string) => Number(value),
    },
  })
  totalExperience!: number;

  @Column({
    name: 'exp_to_next_level',
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value: number | string | null) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  expToNextLevel!: number | null;
}