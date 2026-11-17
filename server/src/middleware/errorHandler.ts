import { ErrorRequestHandler, RequestHandler } from "express";
import { QueryFailedError } from "typeorm";
import { AppError } from "../utils/AppError";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`));
};

// Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  "23505": { status: 409, code: "DUPLICATE", message: "A record with the same unique value already exists" },
  "23503": {
    status: 409,
    code: "FOREIGN_KEY_VIOLATION",
    message: "Operation violates a relationship with another record (it may still be referenced elsewhere)",
  },
  "23514": { status: 400, code: "CHECK_VIOLATION", message: "A value violates a database rule" },
  "23502": { status: 400, code: "NOT_NULL_VIOLATION", message: "A required value is missing" },
  "22P02": { status: 400, code: "INVALID_INPUT", message: "A value has an invalid format" },
  "22007": { status: 400, code: "INVALID_INPUT", message: "A date value has an invalid format" },
  "22003": { status: 400, code: "VALUE_OUT_OF_RANGE", message: "A numeric value is out of range" },
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong";
  let details: unknown;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err?.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "Request body contains invalid JSON";
  } else if (err?.type === "entity.too.large") {
    status = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request body is too large";
  } else if (err instanceof QueryFailedError) {
    const driver = err.driverError as { code?: string; detail?: string } | undefined;
    const mapped = driver?.code ? PG_ERRORS[driver.code] : undefined;
    if (mapped) {
      ({ status, code, message } = mapped);
      details = driver?.detail;
    }
  }

  if (status >= 500) {
    req.log.error({ err, code }, "Unhandled error"); // full error in logs, never in the response
  } else {
    req.log.warn({ code, details }, message);
  }

  if (res.headersSent) return next(err);

  res.status(status).json({
    error: { code, message, ...(details ? { details } : {}), requestId: req.id },
  });
};