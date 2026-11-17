import { Router } from "express";
import { getValidated, validate } from "../middleware/validate";
import { playerService } from "../services/player.service";
import { asyncHandler } from "../utils/asyncHandler";
import { loginBody, LoginDto, registerBody, RegisterDto } from "../validators/player.validators";

const router = Router();

router.post("/register", validate({ body: registerBody }), asyncHandler(async (_req, res) => {
  const { body } = getValidated<RegisterDto>(res);
  res.status(201).json(await playerService.register(body));
}));

router.post("/login", validate({ body: loginBody }), asyncHandler(async (_req, res) => {
  const { body } = getValidated<LoginDto>(res);
  res.json(await playerService.login(body));
}));

export default router;
