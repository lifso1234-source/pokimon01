import { Router } from "express";
import { z, ZodTypeAny } from "zod";
import { getValidated, validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { idParam } from "../utils/pagination";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CrudRouterOptions<TEntity, TCreate, TUpdate> {
  path: string;
  idKey: string;
  idType?: "number" | "uuid";
  service: {
    list: (query: any) => Promise<any>;
    getById: (id: any) => Promise<TEntity>;
    create: (dto: TCreate) => Promise<TEntity>;
    update: (id: any, dto: TUpdate) => Promise<TEntity>;
    remove: (id: any) => Promise<any>;
  };
  listQuery: ZodTypeAny;
  createBody: ZodTypeAny;
  updateBody: ZodTypeAny;
}

export function createCrudRouter<TEntity, TCreate, TUpdate>(
  opts: CrudRouterOptions<TEntity, TCreate, TUpdate>,
) {
  const router = Router();
  const base = `/${opts.path}`;
  const paramSchema =
    opts.idType === "uuid"
      ? z.object({ id: z.string().regex(uuidRegex, "Invalid UUID") })
      : idParam;

  router.get(base, validate({ query: opts.listQuery }), asyncHandler(async (_req, res) => {
    const { query } = getValidated(res);
    res.json(await opts.service.list(query));
  }));

  router.get(`${base}/:id`, validate({ params: paramSchema }), asyncHandler(async (_req, res) => {
    const { params } = getValidated<unknown, { id: any }>(res);
    res.json(await opts.service.getById(params.id));
  }));

  router.post(base, validate({ body: opts.createBody }), asyncHandler(async (_req, res) => {
    const { body } = getValidated<TCreate>(res);
    res.status(201).json(await opts.service.create(body));
  }));

  router.patch(`${base}/:id`, validate({ params: paramSchema, body: opts.updateBody }), asyncHandler(async (_req, res) => {
    const { params, body } = getValidated<TUpdate, { id: any }>(res);
    res.json(await opts.service.update(params.id, body));
  }));

  router.delete(`${base}/:id`, validate({ params: paramSchema }), asyncHandler(async (_req, res) => {
    const { params } = getValidated<unknown, { id: any }>(res);
    res.json(await opts.service.remove(params.id));
  }));

  return router;
}