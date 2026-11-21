import React, { useEffect, useRef } from "react";
import { VIEW_SIZE } from "../constants/mapConfig";
import type { MapTile } from "../types/game.types";

interface MiniMapProps {
  tileMap: Map<string, MapTile>;
  tilesLoaded: boolean;
  playerX: number;
  playerY: number;
  mapWidth?: number;
  mapHeight?: number;
  /** Width of the minimap box in CSS pixels (height scales automatically to 280:175 ratio) */
  displayWidth?: number;
}

const TERRAIN_COLORS: Record<string, string> = {
  grass: "#4ade80",
  path: "#d6b88d",
  sand: "#fde047",
  water: "#38bdf8",
  "deep water": "#1d4ed8",
  tree: "#15803d",
  mountain: "#78716c",
  snow: "#f8fafc",
  cave: "#312e81",
  wheat: "#eab308",
  building: "#dc2626",
  wall: "#1e293b",
};

export const MiniMap: React.FC<MiniMapProps> = ({
  tileMap,
  tilesLoaded,
  playerX,
  playerY,
  mapWidth = 280,
  mapHeight = 175,
  displayWidth = 224,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenTerrainRef = useRef<HTMLCanvasElement | null>(null);

  const displayHeight = Math.round((displayWidth * mapHeight) / mapWidth);

  // 1. Pre-render the 280x175 terrain pixels once into an offscreen canvas
  useEffect(() => {
    if (!tilesLoaded || tileMap.size === 0) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = mapWidth;
    offscreen.height = mapHeight;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;

    offCtx.fillStyle = "#060b14";
    offCtx.fillRect(0, 0, mapWidth, mapHeight);

    tileMap.forEach((tile) => {
      offCtx.fillStyle = TERRAIN_COLORS[tile.terrain] ?? "#334155";
      offCtx.fillRect(tile.x, tile.y, 1, 1);
    });

    offscreenTerrainRef.current = offscreen;
  }, [tileMap, tilesLoaded, mapWidth, mapHeight]);

  // 2. Composite terrain snapshot + live player dot & camera box on movement
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, mapWidth, mapHeight);

    if (offscreenTerrainRef.current) {
      ctx.drawImage(offscreenTerrainRef.current, 0, 0);
    } else {
      ctx.fillStyle = "#060b14";
      ctx.fillRect(0, 0, mapWidth, mapHeight);
    }

    // Draw current camera viewport outline
    const halfView = Math.floor(VIEW_SIZE / 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      playerX - halfView + 0.5,
      playerY - halfView + 0.5,
      VIEW_SIZE,
      VIEW_SIZE,
    );

    // Draw player position dot
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(playerX - 1, playerY - 1, 3, 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(playerX, playerY, 1, 1);
  }, [tilesLoaded, playerX, playerY, mapWidth, mapHeight]);

  return (
    <div style={styles.wrapper}>
      <canvas
        ref={canvasRef}
        width={mapWidth}
        height={mapHeight}
        style={{
          ...styles.canvas,
          width: displayWidth,
          height: displayHeight,
        }}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 4,
    borderRadius: 8,
    background: "rgba(6, 11, 20, 0.85)",
    border: "1px solid #334155",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
    pointerEvents: "none", // clicks pass right through to the main map canvas
    zIndex: 10,
  },
  canvas: {
    display: "block",
    borderRadius: 4,
    imageRendering: "pixelated",
  },
};