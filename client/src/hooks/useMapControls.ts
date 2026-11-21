import { useCallback, useEffect, useState } from "react";
import { extractApiError } from "../api/axiosClient";
import { gameApi } from "../api/gameApi";
import { DIR_DELTAS, HALF_VIEW, TILE_PX } from "../constants/mapConfig";
import type { Battle, Npc, PlayerState, WildSpawn } from "../types/game.types";
import type { Boat } from "./useBoats";
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
  clickRadius?: number;
  boats: Boat[];
  boardedBoatId: string | null;
  setBoardedBoatId: (id: string | null) => void;
  moveBoat: (
    boatId: string,
    x: number,
    y: number,
    facing: "up" | "down" | "left" | "right",
  ) => void;
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
  boats,
  boardedBoatId,
  setBoardedBoatId,
  moveBoat,
}: UseMapControlsParams) {
  const [facing, setFacing] = useState<"up" | "down" | "left" | "right">(
    "down",
  );

  // Sync position to backend ONLY when on land so sailing never overwrites
  // player.posX/posY with a shore tile upon battle end/flee
  const syncLandPositionIfNeeded = useCallback(async () => {
    if (!player || boardedBoatId) return;
    const cur = latestPosRef.current;
    const last = lastSyncedPosRef.current;
    if (!last || cur.x !== last.x || cur.y !== last.y) {
      try {
        await gameApi.movePlayer(player.id, { x: cur.x, y: cur.y });
        lastSyncedPosRef.current = { x: cur.x, y: cur.y };
      } catch {
        // Ignore sync errors so interactions still proceed
      }
    }
  }, [player, boardedBoatId, latestPosRef, lastSyncedPosRef]);

  const interactWithNpc = useCallback(
    async (npc: Npc) => {
      if (!player) return;
      await syncLandPositionIfNeeded();
      onSelectNpc(npc);
    },
    [player, syncLandPositionIfNeeded, onSelectNpc],
  );

  const triggerWildBattle = useCallback(
    async (spawn: WildSpawn) => {
      if (!player || activeBattle) return;
      try {
        await syncLandPositionIfNeeded();

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
      syncLandPositionIfNeeded,
      removeSpawn,
      onBattleStart,
      onNotify,
    ],
  );

  const disembarkBoat = useCallback(() => {
    if (!player || !boardedBoatId) return;
    const activeBoat = boats.find((b) => b.id === boardedBoatId);
    const curX = activeBoat ? activeBoat.x : latestPosRef.current.x;
    const curY = activeBoat ? activeBoat.y : latestPosRef.current.y;

    const adjacentOffsets = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 },
    ];

    let landingTile: { x: number; y: number } | null = null;
    for (const { dx, dy } of adjacentOffsets) {
      const lx = curX + dx;
      const ly = curY + dy;
      const tile = tileMapRef.current.get(`${lx},${ly}`);
      const blockedByNpc = npcs.some((n) => n.posX === lx && n.posY === ly);
      if (tile && tile.isWalkable && !blockedByNpc) {
        landingTile = { x: lx, y: ly };
        break;
      }
    }

    if (!landingTile) {
      onNotify("You cannot go outside here — steer closer to shore!");
      return;
    }

    setBoardedBoatId(null);
    updatePosition(landingTile.x, landingTile.y);
    onNotify("Disembarked onto shore.");
  }, [
    player,
    boardedBoatId,
    boats,
    latestPosRef,
    tileMapRef,
    npcs,
    setBoardedBoatId,
    updatePosition,
    onNotify,
  ]);

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

      if (e.key === "Shift" && boardedBoatId) {
        e.preventDefault();
        disembarkBoat();
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

      if (boardedBoatId) {
        const isWaterTile =
          tile?.terrain === "water" || tile?.terrain === "deep water";
        if (!tile || !isWaterTile || blockingNpc) {
          if (blockingNpc) interactWithNpc(blockingNpc);
          return;
        }
        moveBoat(boardedBoatId, nextX, nextY, dir);
        updatePosition(nextX, nextY);
      } else {
        if (!tile || !tile.isWalkable || blockingNpc) {
          if (blockingNpc) interactWithNpc(blockingNpc);
          return;
        }
        updatePosition(nextX, nextY);
      }

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
    boardedBoatId,
    moveBoat,
    disembarkBoat,
    updatePosition,
    triggerWildBattle,
    interactWithNpc,
  ]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!player || activeBattle) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = e.currentTarget.width / rect.width;
      const scaleY = e.currentTarget.height / rect.height;
      const col = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_PX);
      const row = Math.floor(((e.clientY - rect.top) * scaleY) / TILE_PX);
      const wx = player.posX - HALF_VIEW + col;
      const wy = player.posY - HALF_VIEW + row;

      // 1. Boat click (within 3 blocks to board, or click current boat to exit)
      const clickedBoat = boats.find((b) => b.x === wx && b.y === wy);
      if (clickedBoat) {
        if (boardedBoatId === clickedBoat.id) {
          disembarkBoat();
          return;
        }
        const dist = Math.max(
          Math.abs(clickedBoat.x - player.posX),
          Math.abs(clickedBoat.y - player.posY),
        );
        if (dist <= 3) {
          setBoardedBoatId(clickedBoat.id);
          updatePosition(clickedBoat.x, clickedBoat.y);
          onNotify("Boarded boat! Use WASD/Arrows to sail, Shift to exit.");
        } else {
          onNotify("Move within 3 blocks of the boat to board!");
        }
        return;
      }

      // 2. Wild Pokémon click (within clickRadius, keeps player on current tile/boat)
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
          triggerWildBattle(clickedSpawn);
        } else {
          onNotify(`Move within ${clickRadius} tiles to battle!`);
        }
        return;
      }

      // 3. NPC / Trainer click interaction
      const clickedNpc = npcs.find((n) => n.posX === wx && n.posY === wy);
      if (clickedNpc && clickedNpc.posX != null && clickedNpc.posY != null) {
        const maxNpcDist = boardedBoatId ? 3 : 2;
        const dist = Math.max(
          Math.abs(clickedNpc.posX - player.posX),
          Math.abs(clickedNpc.posY - player.posY),
        );
        if (dist <= maxNpcDist) {
          interactWithNpc(clickedNpc);
        } else {
          onNotify(`Move closer to talk to ${clickedNpc.name}`);
        }
      }
    },
    [
      player,
      activeBattle,
      boats,
      boardedBoatId,
      setBoardedBoatId,
      disembarkBoat,
      updatePosition,
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