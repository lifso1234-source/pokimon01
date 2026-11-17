import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { gameApi } from "../api/gameApi";
import type { PlayerState } from "../types/game.types";

interface PlayerContextValue {
  player: PlayerState | null;
  loading: boolean;
  selectPlayerById: (id: string) => Promise<void>;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerState | null>>;
  refreshPlayer: () => Promise<void>;
  logout: () => void;
}
const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);
const STORAGE_KEY = "poke_active_player_id";

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(true);

  const selectPlayerById = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const state = await gameApi.getPlayerState(id);
      setPlayer(state);
      localStorage.setItem(STORAGE_KEY, id);
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      setPlayer(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPlayer = useCallback(async () => {
    if (!player?.id) return;
    const state = await gameApi.getPlayerState(player.id);
    setPlayer(state);
  }, [player?.id]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPlayer(null);
  }, []);

  useEffect(() => {
    if (player?.id) localStorage.setItem(STORAGE_KEY, player.id);
  }, [player?.id]);

  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) { setLoading(false); return; }
    let cancelled = false;
    gameApi.getPlayerState(id).then((state) => {
      if (!cancelled) setPlayer(state);
    }).catch(() => {
      localStorage.removeItem(STORAGE_KEY);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return <PlayerContext.Provider value={{ player, loading, selectPlayerById, setPlayer, refreshPlayer, logout }}>{children}</PlayerContext.Provider>;
};
export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}
