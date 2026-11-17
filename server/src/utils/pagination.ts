import { z } from "zod";
import { SelectQueryBuilder, ObjectLiteral } from "typeorm";

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  sortBy: z.string().optional(),
  order: z.enum(["ASC", "DESC", "asc", "desc"]).default("ASC"),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;

export const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

export type IdParam = z.infer<typeof idParam>;

export function applySort<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  sortBy: string | undefined,
  order: "ASC" | "DESC" | "asc" | "desc",
  defaultCol: string,
) {
  const col = sortBy || defaultCol;
  const dir = order.toUpperCase() === "DESC" ? "DESC" : "ASC";
  qb.orderBy(`${alias}.${col}`, dir);
}

export async function paginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  q: { page: number; limit: number },
) {
  const skip = (q.page - 1) * q.limit;
  const [data, total] = await qb.skip(skip).take(q.limit).getManyAndCount();
  return {
    data,
    meta: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.ceil(total / q.limit),
    },
  };
}