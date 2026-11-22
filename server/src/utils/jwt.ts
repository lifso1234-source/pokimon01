import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

export function signToken(playerId: string): string {
  return jwt.sign({ playerId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { playerId: string } {
  return jwt.verify(token, JWT_SECRET) as { playerId: string };
}