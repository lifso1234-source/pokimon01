import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import authRoutes from "./auth.routes";
import battleRoutes from "./battle.routes";
import creatureRoutes from "./creature.routes";
import mapRoutes from "./map.routes";
import npcRoutes from "./npc.routes";
import playerRoutes from "./player.routes";
import referenceRoutes from "./reference.routes";
import catchHistory from "./catchHistory.routes";
import levelExperience from "./levelExperience.routes"

const router = Router();

// Public routes (no JWT required)
router.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);

// Auth barrier: all routes below require a valid Bearer JWT
  router.use(authenticate);

// Protected game routes (req.playerId is available in all of these)
router.use(playerRoutes);
router.use(creatureRoutes);
router.use(npcRoutes);
router.use(mapRoutes);
router.use(battleRoutes);
router.use(referenceRoutes);
router.use(catchHistory);
router.use(levelExperience);

export default router;