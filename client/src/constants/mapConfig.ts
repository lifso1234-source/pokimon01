import type { Terrain } from "../types/game.types";

export const VIEW_SIZE = 14; // use 14, to check use 50
export const HALF_VIEW = Math.floor(VIEW_SIZE / 2);
export const TILE_PX = 56; // use 56, to check use 14

export const TERRAIN_COLORS: Record<Terrain, string> = {
  grass: "#2d6a4f",
  water: "#1d4ed8",
  sand: "#cac094",
  cave: "#334155",
  path: "#92785b",
  wall: "#1e293b",
  building: "#7c2d12",
  tree: "#44b646",
  snow: "#eef1df",
  wheat: "#e6e638",
  mountain: "#515658",
  "deep water": "#1c13c1",
};

export const DIR_DELTAS: Record<
  "up" | "down" | "left" | "right",
  { dx: number; dy: number }
> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const SPAWNABLE_TERRAINS: ReadonlySet<Terrain> = new Set([
  "grass",
  "wheat",
  "snow",
  "cave",
  "sand",
]);

export const clickRadius: number = 3;