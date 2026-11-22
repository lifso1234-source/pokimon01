import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyToken } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      playerId?: string;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "No token provided"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.playerId = decoded.playerId;
    next();
  } catch {
    return next(new AppError(401, "INVALID_TOKEN", "Invalid or expired token"));
  }
}