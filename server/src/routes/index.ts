import { Router } from "express";
import authRoutes from "./auth.routes";
import battleRoutes from "./battle.routes";
import creatureRoutes from "./creature.routes";
import mapRoutes from "./map.routes";
import npcRoutes from "./npc.routes";
import playerRoutes from "./player.routes";
import referenceRoutes from "./reference.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use(playerRoutes);
router.use(creatureRoutes);
router.use(npcRoutes);
router.use(mapRoutes);
router.use(battleRoutes);
router.use(referenceRoutes);

export default router;