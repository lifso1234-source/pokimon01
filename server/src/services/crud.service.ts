import { DeepPartial, EntityTarget, FindOptionsRelations, ObjectLiteral } from "typeorm";
import { AppDataSource } from "../data-source";
import { AppError } from "../utils/AppError";

export interface DependentCheck {
  entity: EntityTarget<ObjectLiteral>;
  fk: string;
  label: string;
}

export interface CrudServiceOptions<T extends ObjectLiteral, TCreate, TUpdate> {
  label: string;
  entity: EntityTarget<T>;
  idKey: keyof T & string;
  relations?: FindOptionsRelations<T>;
  beforeWrite?: (dto: Partial<TCreate & TUpdate>) => Promise<void>;
  dependents?: DependentCheck[];
}

export function createCrudService<
  T extends ObjectLiteral,
  TCreate extends DeepPartial<T> = DeepPartial<T>,
  TUpdate extends DeepPartial<T> = DeepPartial<T>,
>(opts: CrudServiceOptions<T, TCreate, TUpdate>) {
  const repo = () => AppDataSource.getRepository(opts.entity);

  return {
    repo,

    async getById(id: number | string): Promise<T> {
      const item = await repo().findOne({
        where: { [opts.idKey]: id } as never,
        relations: opts.relations,
      });
      if (!item) throw new AppError(404, "NOT_FOUND", `${opts.label} not found`);
      return item;
    },

    async create(dto: TCreate): Promise<T> {
      if (opts.beforeWrite) await opts.beforeWrite(dto as Partial<TCreate & TUpdate>);
      const entity = repo().create(dto);
      const saved = await repo().save(entity);
      return this.getById(saved[opts.idKey]);
    },

    async update(id: number | string, dto: TUpdate): Promise<T> {
      const existing = await this.getById(id);
      if (opts.beforeWrite) await opts.beforeWrite(dto as Partial<TCreate & TUpdate>);
      repo().merge(existing, dto);
      await repo().save(existing);
      return this.getById(id);
    },

    async remove(id: number | string): Promise<void> {
      const existing = await this.getById(id);
      for (const dep of opts.dependents ?? []) {
        const count = await AppDataSource.getRepository(dep.entity).countBy({ [dep.fk]: id } as never);
        if (count > 0) {
          throw new AppError(409, "HAS_DEPENDENTS", `Cannot delete ${opts.label}: still referenced by ${dep.label}`);
        }
      }
      await repo().remove(existing);
    },
  };
}
