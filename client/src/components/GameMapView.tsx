import React, { useCallback, useEffect, useRef, useState } from "react";
import { extractApiError } from "../api/axiosClient";
import { gameApi } from "../api/gameApi";
import {
  clickRadius,
  HALF_VIEW,
  TILE_PX,
  VIEW_SIZE,
} from "../constants/mapConfig";
import { usePlayer } from "../context/PlayerContext";
import { useBoats } from "../hooks/useBoats";
import { useMapControls } from "../hooks/useMapControls";
import { useWildSpawner } from "../hooks/useWildSpawner";
import type { Battle, EncounterRule, MapTile, Npc } from "../types/game.types";
import { renderMapScene } from "../utils/mapRenderer";
import { MiniMap } from "./MiniMap";

interface GameMapViewProps {
  activeBattle: Battle | null;
  onBattleStart: (battle: Battle) => void;
  onSelectNpc: (npc: Npc) => void;
  onNotify: (msg: string) => void;
}

export const GameMapView: React.FC<GameMapViewProps> = ({
  activeBattle,
  onBattleStart,
  onSelectNpc,
  onNotify,
}) => {
  const { player, setPlayer } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tilesLoaded, setTilesLoaded] = useState(false);
  const tileMapRef = useRef(new Map());
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [encounters, setEncounters] = useState<EncounterRule[]>([]);

  const [spriteTick, setSpriteTick] = useState(0);
  const [animTick, setAnimTick] = useState(0);

  const lastSyncedPosRef = useRef<{ x: number; y: number } | null>(null);
  const latestPosRef = useRef<{ x: number; y: number }>({
    x: player?.posX ?? 2,
    y: player?.posY ?? 2,
  });

  const updatePosition = useCallback(
    (x: number, y: number) => {
      latestPosRef.current = { x, y };
      setPlayer((current) =>
        current ? { ...current, posX: x, posY: y } : current,
      );
    },
    [setPlayer],
  );

  useEffect(() => {
    if (player) {
      latestPosRef.current = { x: player.posX, y: player.posY };
      lastSyncedPosRef.current = { x: player.posX, y: player.posY };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id]);

  // 1. Load world data
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      gameApi.listTiles(),
      gameApi.listNpcs(),
      gameApi.listEncounters(),
    ])
      .then(([tilesRes, npcsRes, encountersRes]) => {
        if (cancelled) return;
        const map = new Map<string, MapTile>();
        (Array.isArray(tilesRes) ? tilesRes : []).forEach((t) =>
          map.set(`${t.x},${t.y}`, t),
        );
        tileMapRef.current = map;
        setNpcs(Array.isArray(npcsRes) ? npcsRes : []);
        setEncounters(Array.isArray(encountersRes) ? encountersRes : []);
        setTilesLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) onNotify(`Failed to load map: ${extractApiError(err)}`);
      });

    return () => {
      cancelled = true;
    };
  }, [onNotify]);

  // 3. Wild spawns, boats & player controls
  const { spawns, removeSpawn } = useWildSpawner({
    enabled: tilesLoaded && Boolean(player),
    tileMapRef,
    latestPosRef,
    encounters,
    npcs,
  });

  const { boats, boardedBoatId, setBoardedBoatId, moveBoat } = useBoats({
    tilesLoaded,
    tileMapRef,
  });

  // 2. Periodic 30s coordinate sync (only when on land, never while sailing)
  useEffect(() => {
    if (!player || boardedBoatId) return;
    const interval = setInterval(() => {
      const cur = latestPosRef.current;
      const last = lastSyncedPosRef.current;
      if (!last || cur.x !== last.x || cur.y !== last.y) {
        gameApi
          .movePlayer(player.id, { x: cur.x, y: cur.y })
          .then(() => {
            lastSyncedPosRef.current = { x: cur.x, y: cur.y };
          })
          .catch(() => {});
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [player, boardedBoatId]);

  // Keep player locked onto the boat or pre-battle position when a battle ends/flees
  useEffect(() => {
    if (!player || activeBattle) return;

    if (boardedBoatId) {
      const boat = boats.find((b) => b.id === boardedBoatId);
      if (boat && (player.posX !== boat.x || player.posY !== boat.y)) {
        updatePosition(boat.x, boat.y);
      }
      return;
    }

    const expected = latestPosRef.current;
    if (player.posX !== expected.x || player.posY !== expected.y) {
      setPlayer((current) =>
        current ? { ...current, posX: expected.x, posY: expected.y } : current,
      );
    }
  }, [
    activeBattle,
    boardedBoatId,
    boats,
    player,
    updatePosition,
    setPlayer,
  ]);

  const { facing, handleCanvasClick } = useMapControls({
    player,
    activeBattle,
    tileMapRef,
    latestPosRef,
    lastSyncedPosRef,
    npcs,
    spawns,
    removeSpawn,
    updatePosition,
    onBattleStart,
    onSelectNpc,
    onNotify,
    clickRadius,
    boats,
    boardedBoatId,
    setBoardedBoatId,
    moveBoat,
  });

  // Animate water particles whenever a boat is visible in the viewport
  useEffect(() => {
    if (!player || boats.length === 0) return;

    const hasVisibleBoat = boats.some(
      (b) =>
        Math.abs(b.x - player.posX) <= HALF_VIEW &&
        Math.abs(b.y - player.posY) <= HALF_VIEW,
    );
    if (!hasVisibleBoat) return;

    const timer = setInterval(() => {
      setAnimTick((t) => (t + 1) % 1000);
    }, 120);

    return () => clearInterval(timer);
  }, [player, boats]);

  // 4. Draw frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !player) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderMapScene({
      ctx,
      width: canvas.width,
      height: canvas.height,
      playerX: player.posX,
      playerY: player.posY,
      facing,
      tileMap: tileMapRef.current,
      npcs,
      spawns,
      boats,
      boardedBoatId,
      onSpriteLoad: () => setSpriteTick((t) => t + 1),
    });
  }, [
    player,
    tilesLoaded,
    facing,
    npcs,
    spawns,
    boats,
    boardedBoatId,
    spriteTick,
    animTick,
  ]);

  if (!player) return null;

  return (
    <div style={styles.container}>
      <div style={styles.viewportWrapper}>
        <canvas
          ref={canvasRef}
          width={VIEW_SIZE * TILE_PX}
          height={VIEW_SIZE * TILE_PX}
          onClick={handleCanvasClick}
          style={styles.canvas}
        />
        <MiniMap
          tileMap={tileMapRef.current}
          tilesLoaded={tilesLoaded}
          playerX={player.posX}
          playerY={player.posY}
        />
      </div>
      <div style={styles.hudBar}>
        <span>
          Pos: ({player.posX}, {player.posY}){" "}
          {boardedBoatId ? "• ⛵ Sailing" : ""}
        </span>
        <span>
          {boardedBoatId
            ? "WASD / Arrows: Sail • Shift: Exit Boat"
            : "Move: WASD / Arrows • Interact: Space / Click"}
        </span>
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
  viewportWrapper: {
    position: "relative",
    width: VIEW_SIZE * TILE_PX,
    height: VIEW_SIZE * TILE_PX,
  },
};