import { useCallback, useEffect, useState } from "react";
import { HALF_VIEW, SPAWNABLE_TERRAINS } from "../constants/mapConfig";
import type {
  EncounterRule,
  MapTile,
  Npc,
  WildSpawn,
} from "../types/game.types";

export type TileLookup = Map<string, MapTile>;

interface UseWildSpawnerParams {
  enabled: boolean;
  tileMapRef: React.RefObject<TileLookup>;
  latestPosRef: React.RefObject<{ x: number; y: number }>;
  encounters: EncounterRule[];
  npcs: Npc[];
}

export function useWildSpawner({
  enabled,
  tileMapRef,
  latestPosRef,
  encounters,
  npcs,
}: UseWildSpawnerParams) {
  const [spawns, setSpawns] = useState<WildSpawn[]>([]);

  const removeSpawn = useCallback((uid: string) => {
    setSpawns((prev) => prev.filter((s) => s.uid !== uid));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const spawnTick = () => {
      const now = Date.now();
      const { x: px, y: py } = latestPosRef.current;
      const minX = px - HALF_VIEW;
      const maxX = px + HALF_VIEW;
      const minY = py - HALF_VIEW;
      const maxY = py + HALF_VIEW;

      setSpawns((prev) => {
        const visibleActive = prev.filter(
          (spawn) =>
            spawn.expiresAt > now &&
            spawn.x >= minX &&
            spawn.x <= maxX &&
            spawn.y >= minY &&
            spawn.y <= maxY,
        );

        if (visibleActive.length >= 6 || encounters.length === 0) {
          return visibleActive;
        }

        const occupiedByNpc = new Set(
          npcs
            .filter((npc) => npc.posX != null && npc.posY != null)
            .map((npc) => `${npc.posX},${npc.posY}`),
        );
        const occupiedBySpawn = new Set(
          visibleActive.map((spawn) => `${spawn.x},${spawn.y}`),
        );
        const candidates: MapTile[] = [];

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (x === px && y === py) continue;

            const key = `${x},${y}`;
            if (occupiedByNpc.has(key) || occupiedBySpawn.has(key)) continue;

            const tile = tileMapRef.current.get(key);
            const isWater =
              tile?.terrain === "water" || tile?.terrain === "deep water";

            if (
              tile &&
              (tile.isWalkable || isWater) &&
              SPAWNABLE_TERRAINS.has(tile.terrain)
            ) {
              candidates.push(tile);
            }
          }
        }

        if (candidates.length === 0) return visibleActive;

        const chosenTile =
          candidates[Math.floor(Math.random() * candidates.length)];
        const terrainPool = encounters.filter(
          (encounter) => encounter.terrain === chosenTile.terrain,
        );
        if (terrainPool.length === 0) return visibleActive;

        const totalWeight = terrainPool.reduce(
          (sum, e) => sum + (e.weight ?? 1),
          0,
        );
        let roll = Math.random() * totalWeight;
        const encounter =
          terrainPool.find((e) => (roll -= e.weight ?? 1) < 0) ??
          terrainPool[0];
        if (!encounter) return visibleActive;

        const level =
          Math.floor(
            Math.random() * (encounter.maxLevel - encounter.minLevel + 1),
          ) + encounter.minLevel;

        return [
          ...visibleActive,
          {
            uid: `${chosenTile.x},${chosenTile.y}-${now}`,
            x: chosenTile.x,
            y: chosenTile.y,
            speciesId: encounter.speciesId,
            speciesName:
              encounter.species?.name ?? `Wild #${encounter.speciesId}`,
            type1: encounter.species?.type1 ?? "normal",
            level,
            expiresAt: now + 10000,
            spriteUrl: encounter.species?.spriteUrl ?? "",
          },
        ];
      });
    };

    spawnTick();
    const timer = setInterval(spawnTick, 3000);
    return () => clearInterval(timer);
  }, [enabled, tileMapRef, latestPosRef, encounters, npcs]);

  return { spawns, removeSpawn };
}