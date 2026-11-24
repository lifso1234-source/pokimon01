import React, { useCallback, useEffect, useState } from "react";
import { extractApiError } from "./api/axiosClient";
import { gameApi } from "./api/gameApi";
import { BattleModal } from "./components/BattleModal";
import { GameMapView } from "./components/GameMapView";
import { InventoryView } from "./components/InventoryView";
import { LoginScreen } from "./components/LoginScreen";
import { PokedexPanel } from "./components/PokedexPanel";
import { ShopModal } from "./components/ShopModal";
import { type NavTab, SideNavbar } from "./components/SideNavbar";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import type { Battle, Npc } from "./types/game.types";

const GameShell: React.FC = () => {
  const { player, loading, refreshPlayer } = usePlayer();
  const [activeTab, setActiveTab] = useState<NavTab>("map");
  const [battle, setBattle] = useState<Battle | null>(null);
  const [shopNpc, setShopNpc] = useState<Npc | null>(null);
  const [notice, setNotice] = useState("");
  const notify = useCallback((message: string) => setNotice(message), []);

  useEffect(() => {
    if (!player) {
      setBattle(null);
      return;
    }
    gameApi
      .getActiveBattle(player.id)
      .then((active) => setBattle(active))
      .catch((error) => notify(extractApiError(error)));
  }, [player?.id, notify]);

  const interactNpc = async (npc: Npc) => {
    if (!player) return;
    try {
      if (npc.role === "shopkeeper") {
        setShopNpc(npc);
        return;
      }
      if (npc.role === "healer") {
        const result = await gameApi.healParty(player.id);
        await refreshPlayer();
        notify(`Your party is healed (${result.healedCount} creatures).`);
        return;
      }
      if (npc.role === "trainer") {
        const started = await gameApi.startNpcBattle({
          playerId: player.id,
          npcId: npc.id,
        });
        setBattle(started);
        return;
      }
      const dialogue = npc.dialogue as { text?: string; message?: string };
      notify(
        dialogue.text || dialogue.message || `${npc.name}: Hello, trainer!`,
      );
    } catch (error) {
      notify(extractApiError(error));
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "#f8fafc",
          padding: 24,
        }}
      >
        Loading trainer save...
      </div>
    );
  }
  if (!player) return <LoginScreen />;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        background: "#0f172a",
        color: "#f8fafc",
      }}
    >
      <SideNavbar activeTab={activeTab} onSelectTab={setActiveTab} />
      <main style={{ flex: 1, minWidth: 0, padding: 20 }}>
        {notice && (
          <div
            role="status"
            onClick={() => setNotice("")}
            style={{
              padding: 10,
              marginBottom: 12,
              borderRadius: 8,
              background: "#1e3a8a",
              cursor: "pointer",
            }}
          >
            {notice} <span style={{ float: "right" }}>×</span>
          </div>
        )}
        {activeTab === "map" && (
          <GameMapView
            activeBattle={battle}
            onBattleStart={setBattle}
            onSelectNpc={interactNpc}
            onNotify={notify}
          />
        )}
        {activeTab === "inventory" && <InventoryView />}
        {activeTab === "pokedex" && <PokedexPanel />}
      </main>
      {battle && <BattleModal battle={battle} onBattleUpdate={setBattle} />}
      {shopNpc && <ShopModal npc={shopNpc} onClose={() => setShopNpc(null)} />}
    </div>
  );
};

export function App() {
  return (
    <PlayerProvider>
      <GameShell />
    </PlayerProvider>
  );
}

export default App;