import {
  DIR_DELTAS,
  HALF_VIEW,
  TERRAIN_COLORS,
  TILE_PX,
  VIEW_SIZE,
} from "../constants/mapConfig";
import type { Boat } from "../hooks/useBoats";
import type { MapTile, Npc, Terrain, WildSpawn } from "../types/game.types";
import { drawBoatTile } from "./boatRenderer";

interface RenderSceneParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  facing: "up" | "down" | "left" | "right";
  tileMap: Map<string, MapTile>;
  npcs: Npc[];
  spawns: WildSpawn[];
  boats?: Boat[];
  boardedBoatId?: string | null;
  onSpriteLoad?: () => void;
}

const spriteCache = new Map<string, HTMLImageElement | "error">();

function getCachedSprite(
  url: string | null | undefined,
  onLoad?: () => void,
): HTMLImageElement | null {
  if (!url) return null;

  const cached = spriteCache.get(url);
  if (cached === "error") return null;
  if (cached) {
    return cached.complete && cached.naturalWidth > 0 ? cached : null;
  }

  const img = new Image();
  img.onload = () => {
    onLoad?.();
  };
  img.onerror = () => {
    spriteCache.set(url, "error");
  };
  img.src = url;
  spriteCache.set(url, img);

  return img.complete && img.naturalWidth > 0 ? img : null;
}

function drawTerrainDetail(
  ctx: CanvasRenderingContext2D,
  terrain: Terrain,
  px: number,
  py: number,
) {
  switch (terrain) {
    case "building":
      ctx.strokeStyle = "rgba(253, 186, 116, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(px + 4, py + 4, TILE_PX - 8, TILE_PX - 8);
      ctx.fillStyle = "rgba(124, 45, 18, 0.3)";
      ctx.fillRect(px + 8, py + 8, TILE_PX - 16, TILE_PX - 16);
      break;

    case "wall":
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(px + 4, py + 4, TILE_PX - 8, TILE_PX - 8);
      ctx.fillStyle = "rgba(100, 116, 139, 0.4)";
      ctx.fillRect(px + 10, py + 10, 12, 12);
      ctx.fillRect(px + 34, py + 34, 12, 12);
      break;

    case "grass":
      ctx.fillStyle = "rgba(167, 243, 208, 0.25)";
      ctx.fillRect(px + 8, py + 12, 8, 8);
      ctx.fillRect(px + 24, py + 8, 8, 12);
      ctx.fillRect(px + 40, py + 20, 8, 8);
      ctx.fillStyle = "rgba(20, 83, 45, 0.35)";
      ctx.fillRect(px + 16, py + 36, 8, 8);
      ctx.fillRect(px + 36, py + 40, 8, 8);
      break;

    case "wheat":
      ctx.fillStyle = "rgb(168, 162, 106)";
      ctx.fillRect(px + 8, py + 12, 8, 32);
      ctx.fillRect(px + 24, py + 8, 8, 36);
      ctx.fillRect(px + 40, py + 16, 8, 32);
      break;

    case "water":
      ctx.fillStyle = "rgba(80, 78, 63, 0.4)";
      ctx.fillRect(px + 8, py + 12, 16, 8);
      ctx.fillRect(px + 32, py + 28, 16, 8);
      ctx.fillRect(px + 12, py + 44, 12, 8);
      break;

    case "deep water":
      ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
      ctx.fillRect(px + 4, py + 4, TILE_PX - 8, TILE_PX - 8);
      ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
      ctx.fillRect(px + 12, py + 16, 12, 8);
      ctx.fillRect(px + 32, py + 36, 12, 8);
      break;

    case "snow":
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillRect(px + 12, py + 12, 12, 12);
      ctx.fillRect(px + 32, py + 32, 12, 12);
      break;

    case "mountain":
      ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
      ctx.fillRect(px + 8, py + 8, 40, 40);
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillRect(px + 16, py + 8, 24, 16);
      break;

    case "path":
      ctx.fillStyle = "rgba(60, 40, 20, 0.25)";
      ctx.fillRect(px + 8, py + 8, 12, 12);
      ctx.fillRect(px + 32, py + 28, 12, 12);
      break;

    case "tree":
      ctx.fillStyle = "rgba(20, 83, 45, 0.7)";
      ctx.fillRect(px + 6, py + 6, 44, 44);
      ctx.fillStyle = "rgba(74, 222, 128, 0.4)";
      ctx.fillRect(px + 16, py + 16, 16, 16);
      break;

    default:
      break;
  }
}

export function renderMapScene({
  ctx,
  width,
  height,
  playerX,
  playerY,
  facing,
  tileMap,
  npcs,
  spawns,
  boats,
  boardedBoatId,
  onSpriteLoad,
}: RenderSceneParams) {
  ctx.clearRect(0, 0, width, height);

  const startX = playerX - HALF_VIEW;
  const startY = playerY - HALF_VIEW;

  // 1. Terrain Grid
  for (let row = 0; row < VIEW_SIZE; row++) {
    for (let col = 0; col < VIEW_SIZE; col++) {
      const wx = startX + col;
      const wy = startY + row;
      const px = col * TILE_PX;
      const py = row * TILE_PX;

      const tile = tileMap.get(`${wx},${wy}`);
      if (!tile) {
        ctx.fillStyle = "#060b14";
        ctx.fillRect(px, py, TILE_PX, TILE_PX);
        continue;
      }

      const terrain = tile.terrain as Terrain;
      ctx.fillStyle = TERRAIN_COLORS[terrain] ?? "#1e293b";
      ctx.fillRect(px, py, TILE_PX, TILE_PX);

      drawTerrainDetail(ctx, terrain, px, py);

      ctx.strokeStyle = "rgba(15, 23, 42, 0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, TILE_PX, TILE_PX);
    }
  }

  // 2. Wild Spawns
  for (const sp of spawns) {
    const col = sp.x - startX;
    const row = sp.y - startY;
    if (col < 0 || col >= VIEW_SIZE || row < 0 || row >= VIEW_SIZE) continue;

    const px = col * TILE_PX;
    const py = row * TILE_PX;
    const cx = px + TILE_PX / 2;
    const cy = py + TILE_PX / 2;

    const sprite = getCachedSprite(sp.spriteUrl, onSpriteLoad);

    if (sprite) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      ctx.beginPath();
      ctx.ellipse(cx, py + TILE_PX - 8, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      const pad = 4;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        sprite,
        px + pad,
        py + pad - 2,
        TILE_PX - pad * 2,
        TILE_PX - pad * 2,
      );

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(cx - 15, py + TILE_PX - 13, 30, 11);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Lv.${sp.level}`, cx, py + TILE_PX - 4);
    } else {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Lv.${sp.level}`, cx, cy + 3);
    }
  }

  // 3. NPCs
  for (const npc of npcs) {
    if (npc.posX == null || npc.posY == null) continue;
    const col = npc.posX - startX;
    const row = npc.posY - startY;
    if (col < 0 || col >= VIEW_SIZE || row < 0 || row >= VIEW_SIZE) continue;

    const px = col * TILE_PX;
    const py = row * TILE_PX;
    const cx = px + TILE_PX / 2;
    const cy = py + TILE_PX / 2;

    const npcSprite = getCachedSprite(npc.spriteUrl, onSpriteLoad);

    if (npcSprite) {
      const pad = 4;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        npcSprite,
        px + pad,
        py + pad,
        TILE_PX - pad * 2,
        TILE_PX - pad * 2,
      );
    } else {
      ctx.fillStyle =
        npc.role === "healer"
          ? "#ec4899"
          : npc.role === "shopkeeper"
            ? "#eab308"
            : "#a855f7";
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(npc.name.split(" ")[0], cx, py + 10);
  }

  // 3.5 Boats (drawn before Player so player stands on top of the deck)
  for (const boat of boats ?? []) {
    const col = boat.x - startX;
    const row = boat.y - startY;
    if (col < 0 || col >= VIEW_SIZE || row < 0 || row >= VIEW_SIZE) continue;

    drawBoatTile(
      ctx,
      boat,
      col * TILE_PX,
      row * TILE_PX,
      boat.id === boardedBoatId,
    );
  }

  // 4. Player Sprite (Centered)
  const centerPx = HALF_VIEW * TILE_PX + TILE_PX / 2;
  const centerPy = HALF_VIEW * TILE_PX + TILE_PX / 2;

  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.arc(centerPx, centerPy, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  const fDelta = DIR_DELTAS[facing];
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(
    centerPx + fDelta.dx * 9,
    centerPy + fDelta.dy * 9,
    3.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}