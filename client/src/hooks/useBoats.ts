import { useCallback, useEffect, useState } from "react";
import type { MapTile } from "../types/game.types";
import type { TileLookup } from "./useWildSpawner";

export interface Boat {
  id: string;
  x: number;
  y: number;
  facing: "up" | "down" | "left" | "right";
}

interface UseBoatsParams {
  tilesLoaded: boolean;
  tileMapRef: React.RefObject<TileLookup>; // or React.RefObject>
  mapWidth?: number;
  mapHeight?: number;
}

const WATER_TERRAINS = new Set(["water", "deep water"]);
const CARDINAL_DIRS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

export function useBoats({
  tilesLoaded,
  tileMapRef,
  mapWidth = 500,
  mapHeight = 300,
}: UseBoatsParams) {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [boardedBoatId, setBoardedBoatId] = useState<string | null>(null);

  // Detect every distinct lake/river via BFS and spawn 1 shoreline boat per water body
  useEffect(() => {
    if (!tilesLoaded || tileMapRef.current.size === 0) return;

    const visited = new Set<string>();
    const generatedBoats: Boat[] = [];
    let bodyIndex = 1;

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const startKey = `${x},${y}`;
        if (visited.has(startKey)) continue;

        const startTile = tileMapRef.current.get(startKey);
        if (!startTile || !WATER_TERRAINS.has(startTile.terrain)) continue;

        // BFS to collect all connected water/deep-water tiles in this lake or river
        const queue: MapTile[] = [startTile];
        visited.add(startKey);
        const shorelineWaterTiles: MapTile[] = [];
        const allWaterTiles: MapTile[] = [];

        while (queue.length > 0) {
          const current = queue.shift()!;
          allWaterTiles.push(current);

          let touchesWalkableShore = false;

          for (const { dx, dy } of CARDINAL_DIRS) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            const nKey = `${nx},${ny}`;
            const neighbor = tileMapRef.current.get(nKey);
            if (!neighbor) continue;

            if (WATER_TERRAINS.has(neighbor.terrain)) {
              if (!visited.has(nKey)) {
                visited.add(nKey);
                queue.push(neighbor);
              }
            } else if (neighbor.isWalkable) {
              touchesWalkableShore = true;
            }
          }

          if (touchesWalkableShore) {
            shorelineWaterTiles.push(current);
          }
        }

        // Ignore tiny 1–2 tile puddles; place 1 boat per real lake/river
        if (allWaterTiles.length >= 4) {
          const candidates =
            shorelineWaterTiles.length > 0
              ? shorelineWaterTiles
              : allWaterTiles;
          // Pick a consistent shoreline spot near the middle of the shoreline list
          const dockTile = candidates[Math.floor(candidates.length / 2)];
          generatedBoats.push({
            id: `boat-${bodyIndex++}`,
            x: dockTile.x,
            y: dockTile.y,
            facing: "down",
          });
        }
      }
    }

    setBoats(generatedBoats);
  }, [tilesLoaded, tileMapRef, mapWidth, mapHeight]);

  const moveBoat = useCallback(
    (boatId: string, x: number, y: number, facing: "up" | "down" | "left" | "right") => {
      setBoats((prev) =>
        prev.map((b) => (b.id === boatId ? { ...b, x, y, facing } : b)),
      );
    },
    [],
  );

  return {
    boats,
    boardedBoatId,
    setBoardedBoatId,
    moveBoat,
  };
}