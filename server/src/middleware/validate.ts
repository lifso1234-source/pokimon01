import { RequestHandler, Response } from "express";
import { ZodError, ZodTypeAny } from "zod";
import { AppError } from "../utils/AppError";

interface Schemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, res, next) => {
    try {
      res.locals.validated = {
        body: schemas.body ? schemas.body.parse(req.body) : req.body,
        params: schemas.params ? schemas.params.parse(req.params) : req.params,
        query: schemas.query ? schemas.query.parse(req.query) : req.query,
      };
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new AppError(400, "VALIDATION_ERROR", "Invalid request data", err.flatten()));
      }
      next(err);
    }
  };

export function getValidated<TBody = unknown, TParams = unknown, TQuery = unknown>(res: Response) {
  return res.locals.validated as { body: TBody; params: TParams; query: TQuery };
}
