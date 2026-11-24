import { NextFunction, Request, Response, Router } from 'express';
import { ExperienceService } from '../services/levelExperience.service';
import { asyncHandler } from '../utils/asyncHandler';
const router = Router();

router.get("/levels", asyncHandler(async (_req, res) => {
  res.json(await ExperienceService.getAllLevels());
}));

export default router;