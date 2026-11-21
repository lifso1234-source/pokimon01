import { TILE_PX } from "../constants/mapConfig";
import type { Boat } from "../hooks/useBoats";

export function drawBoatTile(
  ctx: CanvasRenderingContext2D,
  boat: Boat,
  px: number,
  py: number,
  isBoarded: boolean,
) {
  const cx = px + TILE_PX / 2;
  const cy = py + TILE_PX / 2;
  const t = performance.now() / 350;

  // 1. Water ripple & foam particles around the wooden hull
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + t * 0.7;
    const radius = (isBoarded ? 22 : 19) + Math.sin(t * 2 + i) * 2.5;
    const rx = cx + Math.cos(angle) * radius;
    const ry = cy + Math.sin(angle) * radius;

    ctx.fillStyle =
      i % 2 === 0 ? "rgba(224, 242, 254, 0.75)" : "rgba(125, 211, 252, 0.55)";
    ctx.beginPath();
    ctx.arc(rx, ry, isBoarded ? 2.6 : 2.0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Extra wake trail behind the stern when boarded
  if (isBoarded) {
    const sternOffset =
      boat.facing === "up"
        ? { x: 0, y: 22 }
        : boat.facing === "down"
          ? { x: 0, y: -22 }
          : boat.facing === "left"
            ? { x: 22, y: 0 }
            : { x: -22, y: 0 };

    for (let p = 0; p < 5; p++) {
      const jitterX = Math.sin(t * 4 + p * 1.7) * 7;
      const jitterY = Math.cos(t * 3.5 + p * 2.1) * 7;
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillRect(
        cx + sternOffset.x + jitterX - 1.5,
        cy + sternOffset.y + jitterY - 1.5,
        3,
        3,
      );
    }
  }

  // 2. Wooden planked boat deck
  const pad = 9;
  const w = TILE_PX - pad * 2;
  const h = TILE_PX - pad * 2;

  // Hull shadow
  ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
  ctx.fillRect(px + pad + 2, py + pad + 3, w, h);

  // Base wood fill
  ctx.fillStyle = "#92400e";
  ctx.fillRect(px + pad, py + pad, w, h);

  // Wood grain planks
  ctx.fillStyle = "#b45309";
  ctx.fillRect(px + pad + 3, py + pad + 4, w - 6, 7);
  ctx.fillRect(px + pad + 3, py + pad + 15, w - 6, 8);
  ctx.fillRect(px + pad + 3, py + pad + 27, w - 6, 7);

  // Dark plank seams & timber border
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + pad, py + pad, w, h);

  ctx.fillStyle = "#78350f";
  ctx.fillRect(px + pad + 2, py + pad + 12, w - 4, 2);
  ctx.fillRect(px + pad + 2, py + pad + 24, w - 4, 2);

  // Brass corner rivets
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(px + pad + 3, py + pad + 3, 3, 3);
  ctx.fillRect(px + pad + w - 6, py + pad + 3, 3, 3);
  ctx.fillRect(px + pad + 3, py + pad + h - 6, 3, 3);
  ctx.fillRect(px + pad + w - 6, py + pad + h - 6, 3, 3);

  ctx.restore();
}