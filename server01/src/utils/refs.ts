import { EntityTarget, ObjectLiteral } from "typeorm";
import { AppDataSource } from "../data-source";
import { AppError } from "./AppError";

export async function assertRefExists<T extends ObjectLiteral>(
  entity: EntityTarget<T>,
  key: keyof T & string,
  value: unknown,
  label: string,
) {
  if (value === undefined || value === null) return;
  const exists = await AppDataSource.getRepository(entity).findOneBy({ [key]: value } as never);
  if (!exists) {
    throw new AppError(400, "INVALID_REFERENCE", `${label} with ${key}=${String(value)} does not exist`);
  }
}
