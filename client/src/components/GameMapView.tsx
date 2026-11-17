import React, { useCallback, useEffect, useRef, useState } from "react";
import { extractApiError } from "../api/axiosClient";
import { gameApi } from "../api/gameApi";
import { usePlayer } from "../context/PlayerContext";
import type { Battle, EncounterRule, MapTile, Npc, Terrain, WildSpawn } from "../types/game.types";

interface GameMapViewProps {
  activeBattle: Battle | null;
  onBattleStart: (battle: Battle) => void;
  onSelectNpc: (npc: Npc) => void;
  onNotify: (msg: string) => void;
}

const VIEW_SIZE = 100; // 9x9 centered camera
const HALF_VIEW = Math.floor(VIEW_SIZE / 2); // 4
const TILE_PX = 14;

const TERRAIN_COLORS: Record<Terrain, string> = {
  grass: "#2d6a4f",
  water: "#1d4ed8",
  sand: "#d97706",
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

const DIR_DELTAS: Record<"up" | "down" | "left" | "right", { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const GameMapView: React.FC<GameMapViewProps> = ({
  activeBattle,
  onBattleStart,
  onSelectNpc,
  onNotify,
}) => {
  const { player, setPlayer } = usePlayer();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [facing, setFacing] = useState<"up" | "down" | "left" | "right">("down");
  const tileMapRef = useRef(new Map());
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [encounters, setEncounters] = useState<EncounterRule[]>([]);
  const [spawns, setSpawns] = useState<WildSpawn[]>([]);

  const lastSyncedPosRef = useRef<{ x: number; y: number } | null>(null);
  const latestPosRef = useRef<{ x: number; y: number }>({
    x: player?.posX ?? 2,
    y: player?.posY ?? 2,
  });

  // Update local player coordinates immediately so the camera and spawner
  // always use the same current position.
  const updatePosition = useCallback((x: number, y: number) => {
    latestPosRef.current = { x, y };
    setPlayer((current) => current ? { ...current, posX: x, posY: y } : current);
  }, [setPlayer]);

  useEffect(() => {
    if (player) {
      latestPosRef.current = { x: player.posX, y: player.posY };
      if (!lastSyncedPosRef.current) {
        lastSyncedPosRef.current = { x: player.posX, y: player.posY };
      }
    }
  }, [player]);

  // 1. Load map tiles, NPCs, and encounter table
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      gameApi.listTiles(),
      gameApi.listNpcs(),
      gameApi.listEncounters(),
    ])
      .then(([tilesRes, npcsRes, encountersRes]) => {
        if (cancelled) return;
        const safeTiles = Array.isArray(tilesRes) ? tilesRes : [];
        const safeNpcs = Array.isArray(npcsRes) ? npcsRes : [];
        const safeEncounters = Array.isArray(encountersRes) ? encountersRes : [];

        const map = new Map<string, MapTile>();
        safeTiles.forEach((t) => map.set(`${t.x},${t.y}`, t));
        tileMapRef.current = map;

        setNpcs(safeNpcs);
        setEncounters(safeEncounters);
        setTilesLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) onNotify(`Failed to load map: ${extractApiError(err)}`);
      });

    return () => {
      cancelled = true;
    };
  }, [onNotify]);

  // 2. Sync player coordinates to backend every 30 seconds
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      const cur = latestPosRef.current;
      const last = lastSyncedPosRef.current;
      if (!last || cur.x !== last.x || cur.y !== last.y) {
        gameApi
          .movePlayer(player.id, { x: cur.x, y: cur.y })
          .then(() => {
            lastSyncedPosRef.current = { x: cur.x, y: cur.y };
          })
          .catch(() => {
            // Retry on next 30s tick
          });
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [player]);

  // 3. Wild creature spawner: ONLY spawn on valid tiles in the visible 9x9 viewport.
  useEffect(() => {
    if (!tilesLoaded || !player) return;

    const spawnTick = () => {
      const now = Date.now();
      const { x: px, y: py } = latestPosRef.current;
      const minX = px - HALF_VIEW;
      const maxX = px + HALF_VIEW;
      const minY = py - HALF_VIEW;
      const maxY = py + HALF_VIEW;

      setSpawns((prev) => {
        // Expire old spawns and immediately remove anything no longer visible.
        const visibleActive = prev.filter(
          (spawn) =>
            spawn.expiresAt > now &&
            spawn.x >= minX && spawn.x <= maxX &&
            spawn.y >= minY && spawn.y <= maxY
        );

        if (visibleActive.length >= 6 || encounters.length === 0) {
          return visibleActive;
        }

        const occupiedByNpc = new Set(
          (npcs ?? [])
            .filter((npc) => npc.posX != null && npc.posY != null)
            .map((npc) => `${npc.posX},${npc.posY}`)
        );
        const occupiedBySpawn = new Set(
          visibleActive.map((spawn) => `${spawn.x},${spawn.y}`)
        );
        const candidates: MapTile[] = [];

        // The visible map is exactly 9x9: player position +/- 4 tiles.
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            // Never spawn on the player's current tile.
            if (x === px && y === py) continue;

            const key = `${x},${y}`;
            if (occupiedByNpc.has(key) || occupiedBySpawn.has(key)) continue;

            const tile = tileMapRef.current.get(key) as MapTile | undefined;
            if (
              tile &&
              tile.isWalkable &&
              (tile.terrain === "grass" ||
                tile.terrain === "cave" ||
                tile.terrain === "sand")
            ) {
              candidates.push(tile);
            }
          }
        }

        if (candidates.length === 0) return visibleActive;

        const chosenTile = candidates[Math.floor(Math.random() * candidates.length)];
        // Only use encounter rules matching this tile's terrain; never fall back
        // to a different terrain's encounter table.
        const terrainPool = encounters.filter(
          (encounter) => encounter.terrain === chosenTile.terrain
        );
        if (terrainPool.length === 0) return visibleActive;

        const encounter = terrainPool[Math.floor(Math.random() * terrainPool.length)];
        if (!encounter) return visibleActive;

        const level =
          Math.floor(Math.random() * (encounter.maxLevel - encounter.minLevel + 1)) +
          encounter.minLevel;

        return [
          ...visibleActive,
          {
            uid: `${chosenTile.x},${chosenTile.y}-${now}`,
            x: chosenTile.x,
            y: chosenTile.y,
            speciesId: encounter.speciesId,
            speciesName: encounter.species?.name ?? `Wild #${encounter.speciesId}`,
            type1: encounter.species?.type1 ?? "normal",
            level,
            expiresAt: now + 35_000,
          },
        ];
      });
    };

    spawnTick();
    const timer = setInterval(spawnTick, 6_000);
    return () => clearInterval(timer);
  }, [tilesLoaded, player, encounters, npcs]);

  // 4. Trigger wild encounter when stepping onto a spawn
  const triggerWildBattle = useCallback(
    async (spawn: WildSpawn) => {
      if (!player || activeBattle) return;
      try {
        await gameApi.movePlayer(player.id, { x: spawn.x, y: spawn.y });
        lastSyncedPosRef.current = { x: spawn.x, y: spawn.y };

        const battle = await gameApi.startWildBattle({
          playerId: player.id,
          speciesId: spawn.speciesId,
          level: spawn.level,
        });
        setSpawns((prev) => prev.filter((s) => s.uid !== spawn.uid));
        onBattleStart(battle);
      } catch (err) {
        onNotify(extractApiError(err));
      }
    },
    [player, activeBattle, onBattleStart, onNotify],
  );

  // 5. Keyboard movement (WASD / Arrow keys) & Space/Enter interact
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!player || activeBattle) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;

      let dir: "up" | "down" | "left" | "right" | null = null;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") dir = "up";
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") dir = "down";
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") dir = "left";
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dir = "right";
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const delta = DIR_DELTAS[facing];
        const fx = latestPosRef.current.x + delta.dx;
        const fy = latestPosRef.current.y + delta.dy;
        const targetNpc = (npcs ?? []).find((n) => n.posX === fx && n.posY === fy);
        if (targetNpc) onSelectNpc(targetNpc);
        return;
      }

      if (!dir) return;
      e.preventDefault();
      setFacing(dir);

      const { dx, dy } = DIR_DELTAS[dir];
      const nextX = latestPosRef.current.x + dx;
      const nextY = latestPosRef.current.y + dy;

      const tile = tileMapRef.current.get(`${nextX},${nextY}`);
      const blockingNpc = (npcs ?? []).find((n) => n.posX === nextX && n.posY === nextY);

      if (!tile || !tile.isWalkable || blockingNpc) {
        if (blockingNpc) onSelectNpc(blockingNpc);
        return;
      }

      updatePosition(nextX, nextY);

      const steppedSpawn = spawns.find((s) => s.x === nextX && s.y === nextY);
      if (steppedSpawn) {
        triggerWildBattle(steppedSpawn);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, activeBattle, facing, npcs, spawns, updatePosition, triggerWildBattle, onSelectNpc]);

  // 6. Render 9x9 centered camera on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !player) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startX = player.posX - HALF_VIEW;
    const startY = player.posY - HALF_VIEW;

    for (let row = 0; row < VIEW_SIZE; row++) {
      for (let col = 0; col < VIEW_SIZE; col++) {
        const wx = startX + col;
        const wy = startY + row;
        const px = col * TILE_PX;
        const py = row * TILE_PX;

        const tile = tileMapRef.current.get(`${wx},${wy}`);
        if (!tile) {
          ctx.fillStyle = "#060b14";
          ctx.fillRect(px, py, TILE_PX, TILE_PX);
          continue;
        }

        const terrain = tile.terrain as Terrain;

        ctx.fillStyle = TERRAIN_COLORS[terrain] ?? "#1e293b";
        ctx.fillRect(px, py, TILE_PX, TILE_PX);

        if (tile.terrain === "building") {
          ctx.strokeStyle = "rgba(253, 186, 116, 0.25)";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
        } else if (tile.terrain === "wall") {
          ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
          ctx.fillRect(px + 4, py + 4, TILE_PX - 8, TILE_PX - 8);
        } else if (tile.terrain === "grass") {
          ctx.fillStyle = "rgba(167, 243, 208, 0.16)";
          ctx.fillRect(px + 12, py + 16, 4, 10);
          ctx.fillRect(px + 34, py + 28, 4, 10);
        }

        ctx.strokeStyle = "rgba(15, 23, 42, 0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TILE_PX, TILE_PX);
      }
    }

    // Draw wild spawns inside viewport
    for (const sp of spawns) {
      const col = sp.x - startX;
      const row = sp.y - startY;
      if (col < 0 || col >= VIEW_SIZE || row < 0 || row >= VIEW_SIZE) continue;

      const cx = col * TILE_PX + TILE_PX / 2;
      const cy = row * TILE_PX + TILE_PX / 2;

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Lv.${sp.level}`, cx, cy + 3);
    }

    // Draw NPCs inside viewport
    for (const npc of npcs ?? []) {
      if (npc.posX == null || npc.posY == null) continue;
      const col = npc.posX - startX;
      const row = npc.posY - startY;
      if (col < 0 || col >= VIEW_SIZE || row < 0 || row >= VIEW_SIZE) continue;

      const cx = col * TILE_PX + TILE_PX / 2;
      const cy = row * TILE_PX + TILE_PX / 2;

      ctx.fillStyle =
        npc.role === "healer"
          ? "#ec4899"
          : npc.role === "shopkeeper"
            ? "#eab308"
            : "#a855f7";
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(npc.name.split(" ")[0], cx, cy - 20);
    }

    // Draw Player at exact center (4, 4)
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
    ctx.arc(centerPx + fDelta.dx * 9, centerPy + fDelta.dy * 9, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }, [player, tilesLoaded, facing, npcs, spawns]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!player || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / TILE_PX);
    const row = Math.floor((e.clientY - rect.top) / TILE_PX);
    const wx = player.posX - HALF_VIEW + col;
    const wy = player.posY - HALF_VIEW + row;

    const clickedNpc = (npcs ?? []).find((n) => n.posX === wx && n.posY === wy);
    if (clickedNpc && clickedNpc.posX != null && clickedNpc.posY != null) {
      const dist = Math.abs(clickedNpc.posX - player.posX) + Math.abs(clickedNpc.posY - player.posY);
      if (dist <= 2) {
        onSelectNpc(clickedNpc);
      } else {
        onNotify(`Walk closer to talk to ${clickedNpc.name}`);
      }
    }
  };

  if (!player) return null;

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        width={VIEW_SIZE * TILE_PX}
        height={VIEW_SIZE * TILE_PX}
        onClick={handleCanvasClick}
        style={styles.canvas}
      />
      <div style={styles.hudBar}>
        <span>
          Pos: ({player.posX}, {player.posY})
        </span>
        <span>Move: WASD / Arrows • Interact: Space / Click NPC</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  canvas: {
    borderRadius: 10,
    border: "2px solid #1e293b",
    background: "#060b14",
    cursor: "pointer",
  },
  hudBar: {
    width: VIEW_SIZE * TILE_PX,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#94a3b8",
  },
};