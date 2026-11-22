import { Router } from "express";
import { getValidated, validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { loginBody, LoginDto, registerBody, RegisterDto } from "../validators/player.validators";
import { loginPlayerService } from "../services/login.service";

const router = Router();

router.post("/register", validate({ body: registerBody }), asyncHandler(async (_req, res) => {
  const { body } = getValidated<RegisterDto>(res);
  res.status(201).json(await loginPlayerService.register(body));
}));

router.post("/login", validate({ body: loginBody }), asyncHandler(async (_req, res) => {
  const { body } = getValidated<LoginDto>(res);
  res.json(await loginPlayerService.login(body));
}));

export default router;
