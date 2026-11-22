import React from "react";
import { usePlayer } from "../context/PlayerContext";

export type NavTab = "map" | "inventory" | "pokedex";

interface SideNavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const SideNavbar: React.FC<SideNavbarProps> = ({ activeTab, onSelectTab }) => {
  const { player, logout } = usePlayer();
  if (!player) return null;

  const party = player.creatures
    .filter((c) => c.partySlot !== null)
    .sort((a, b) => (a.partySlot ?? 9) - (b.partySlot ?? 9));

  return (
    <aside style={styles.sidebar}>
      <div>
        <div style={styles.trainerBox}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{player.trainerName}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>@{player.username}</div>
          <div style={{ marginTop: 6, color: "#4ade80", fontWeight: 600 }}>${player.money}</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>
            Pos: ({player.posX}, {player.posY})
          </div>
        </div>

        <nav style={styles.nav}>
          <button
            onClick={() => onSelectTab("map")}
            style={{
              ...styles.navBtn,
              background: activeTab === "map" ? "#2563eb" : "transparent",
            }}
          >
            1. Map
          </button>
          <button
            onClick={() => onSelectTab("inventory")}
            style={{
              ...styles.navBtn,
              background: activeTab === "inventory" ? "#2563eb" : "transparent",
            }}
          >
            2. Inventory & Slots (1–9)
          </button>
          <button
            onClick={() => onSelectTab("pokedex")}
            style={{
              ...styles.navBtn,
              background: activeTab === "pokedex" ? "#2563eb" : "transparent",
            }}
          >
            3. Pokédex
          </button>
        </nav>

        <div style={{ marginTop: 20 }}>
          <div style={styles.sectionTitle}>Party ({party.length}/6)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {party.map((c) => (
              <div key={c.id} style={styles.partyChip}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {c.nickname || c.species?.name} <span style={{ color: "#94a3b8" }}>Lv.{c.level}</span>
                </div>
                <div style={{ fontSize: 11, color: c.currentHp > 0 ? "#4ade80" : "#f87171" }}>
                  HP: {c.currentHp}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={logout} style={styles.logoutBtn}>
        Switch Player
      </button>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 240,
    minHeight: "100vh",
    background: "#1e293b",
    borderRight: "1px solid #334155",
    color: "#f8fafc",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxSizing: "border-box",
  },
  trainerBox: {
    background: "#0f172a",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #334155",
    marginBottom: 16,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  navBtn: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    color: "#f8fafc",
    fontWeight: 600,
    textAlign: "left",
    cursor: "pointer",
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#94a3b8",
    marginBottom: 8,
  },
  partyChip: {
    background: "#0f172a",
    padding: "6px 10px",
    borderRadius: 6,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutBtn: {
    padding: "9px 12px",
    borderRadius: 6,
    border: "1px solid #475569",
    background: "transparent",
    color: "#cbd5e1",
    cursor: "pointer",
  },
};
