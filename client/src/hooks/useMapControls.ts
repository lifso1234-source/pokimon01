import { useCallback, useEffect, useState } from "react";
import { extractApiError } from "../api/axiosClient";
import { gameApi } from "../api/gameApi";
import { DIR_DELTAS, HALF_VIEW, TILE_PX } from "../constants/mapConfig";
import type { Battle, Npc, PlayerState, WildSpawn } from "../types/game.types";
import type { TileLookup } from "./useWildSpawner";

interface UseMapControlsParams {
  player: PlayerState | null;
  activeBattle: Battle | null;
  tileMapRef: React.RefObject<TileLookup>;
  latestPosRef: React.RefObject<{ x: number; y: number }>;
  lastSyncedPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  npcs: Npc[];
  spawns: WildSpawn[];
  removeSpawn: (uid: string) => void;
  updatePosition: (x: number, y: number) => void;
  onBattleStart: (battle: Battle) => void;
  onSelectNpc: (npc: Npc) => void;
  onNotify: (msg: string) => void;
  clickRadius?: number; // Configurable tile radius for clicking wild Pokémon
}

export function useMapControls({
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
  clickRadius = 2,
}: UseMapControlsParams) {
  const [facing, setFacing] = useState<"up" | "down" | "left" | "right">(
    "down",
  );

  const interactWithNpc = useCallback(
    async (npc: Npc) => {
      if (!player) return;
      const cur = latestPosRef.current;
      const last = lastSyncedPosRef.current;
      if (!last || cur.x !== last.x || cur.y !== last.y) {
        try {
          await gameApi.movePlayer(player.id, { x: cur.x, y: cur.y });
          lastSyncedPosRef.current = { x: cur.x, y: cur.y };
        } catch {
          // Proceed to open NPC even if position sync fails
        }
      }
      onSelectNpc(npc);
    },
    [player, latestPosRef, lastSyncedPosRef, onSelectNpc],
  );

  const triggerWildBattle = useCallback(
    async (spawn: WildSpawn) => {
      if (!player || activeBattle) return;
      try {
        const cur = latestPosRef.current;
        const last = lastSyncedPosRef.current;
        if (!last || cur.x !== last.x || cur.y !== last.y) {
          await gameApi.movePlayer(player.id, { x: cur.x, y: cur.y });
          lastSyncedPosRef.current = { x: cur.x, y: cur.y };
        }

        const battle = await gameApi.startWildBattle({
          playerId: player.id,
          speciesId: spawn.speciesId,
          level: spawn.level,
        });
        removeSpawn(spawn.uid);
        onBattleStart(battle);
      } catch (err) {
        onNotify(extractApiError(err));
      }
    },
    [
      player,
      activeBattle,
      latestPosRef,
      lastSyncedPosRef,
      removeSpawn,
      onBattleStart,
      onNotify,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!player || activeBattle) return;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName,
        )
      ) {
        return;
      }

      let dir: "up" | "down" | "left" | "right" | null = null;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") dir = "up";
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S")
        dir = "down";
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
        dir = "left";
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
        dir = "right";
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const delta = DIR_DELTAS[facing];
        const fx = latestPosRef.current.x + delta.dx;
        const fy = latestPosRef.current.y + delta.dy;
        const targetNpc = npcs.find((n) => n.posX === fx && n.posY === fy);
        if (targetNpc) {
          interactWithNpc(targetNpc);
          return;
        }
        const targetSpawn = spawns.find((s) => s.x === fx && s.y === fy);
        if (targetSpawn) {
          // updatePosition(targetSpawn.x, targetSpawn.y);
          triggerWildBattle(targetSpawn);
        }
        return;
      }

      if (!dir) return;
      e.preventDefault();
      setFacing(dir);

      const { dx, dy } = DIR_DELTAS[dir];
      const nextX = latestPosRef.current.x + dx;
      const nextY = latestPosRef.current.y + dy;

      const tile = tileMapRef.current.get(`${nextX},${nextY}`);
      const blockingNpc = npcs.find(
        (n) => n.posX === nextX && n.posY === nextY,
      );

      if (!tile || !tile.isWalkable || blockingNpc) {
        if (blockingNpc) interactWithNpc(blockingNpc);
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
  }, [
    player,
    activeBattle,
    facing,
    tileMapRef,
    latestPosRef,
    npcs,
    spawns,
    updatePosition,
    triggerWildBattle,
    interactWithNpc,
  ]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!player || activeBattle) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const col = Math.floor((e.clientX - rect.left) / TILE_PX);
      const row = Math.floor((e.clientY - rect.top) / TILE_PX);
      const wx = player.posX - HALF_VIEW + col;
      const wy = player.posY - HALF_VIEW + row;

      // 1. Check if a wild Pokémon spawn was clicked within clickRadius
      const clickedSpawn = spawns.find((s) => s.x === wx && s.y === wy);
      if (clickedSpawn) {
        const dx = clickedSpawn.x - player.posX;
        const dy = clickedSpawn.y - player.posY;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));

        if (dist <= clickRadius) {
          if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
            setFacing(dx > 0 ? "right" : "left");
          } else if (dy !== 0) {
            setFacing(dy > 0 ? "down" : "up");
          }
          // ← Removed `updatePosition(clickedSpawn.x, clickedSpawn.y);` from here
          triggerWildBattle(clickedSpawn);
        } else {
          onNotify(`Walk within ${clickRadius} tiles to battle!`);
        }
        return;
      }

      // 2. Existing NPC click interaction
      const clickedNpc = npcs.find((n) => n.posX === wx && n.posY === wy);
      if (clickedNpc && clickedNpc.posX != null && clickedNpc.posY != null) {
        const dist =
          Math.abs(clickedNpc.posX - player.posX) +
          Math.abs(clickedNpc.posY - player.posY);
        if (dist <= 2) {
          interactWithNpc(clickedNpc);
        } else {
          onNotify(`Walk closer to talk to ${clickedNpc.name}`);
        }
      }
    },
    [
      player,
      activeBattle,
      spawns,
      npcs,
      clickRadius,
      triggerWildBattle,
      interactWithNpc,
      onNotify,
    ],
  );

  return { facing, handleCanvasClick };
}
