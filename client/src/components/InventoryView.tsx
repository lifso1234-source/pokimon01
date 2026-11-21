import React, { useState } from "react";
import { extractApiError } from "../api/axiosClient";
import { gameApi } from "../api/gameApi";
import { usePlayer } from "../context/PlayerContext";
import type { Creature } from "../types/game.types";

export const InventoryView: React.FC = () => {
  const { player, refreshPlayer } = usePlayer();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!player) return null;
  const party = player.creatures
    .filter((c) => c.partySlot !== null)
    .sort((a, b) => (a.partySlot ?? 9) - (b.partySlot ?? 9));
  const storage = player.creatures
    .filter((c) => c.storageSlot !== null)
    .sort((a, b) => (a.storageSlot ?? 999) - (b.storageSlot ?? 999));
  const selected = player.inventory.find(
    (entry) => entry.itemId === selectedItemId,
  );
  const perform = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await refreshPlayer();
      setMessage(success);
    } catch (error) {
      setMessage(extractApiError(error));
    } finally {
      setBusy(false);
    }
  };
  const assign = (slot: number) => {
    if (selectedItemId === null) {
      setMessage("Select an item first, then choose a hotbar slot.");
      return;
    }
    void perform(
      () => gameApi.setHotbarSlot(player.id, slot, selectedItemId),
      `Assigned item to slot ${slot}.`,
    );
  };
  const clear = (slot: number) =>
    void perform(
      () => gameApi.clearHotbarSlot(player.id, slot),
      `Cleared slot ${slot}.`,
    );
  const useMedicine = (itemId: number, creatureId: string) =>
    void perform(
      () => gameApi.useItem(player.id, { itemId, creatureId }),
      "Item used successfully.",
    );
  const moveToStorage = (creature: Creature) => {
    if (party.length <= 1) {
      setMessage("You must keep at least one creature in your party.");
      return;
    }
    const slot =
      storage.reduce((max, item) => Math.max(max, item.storageSlot ?? 0), 0) +
      1;
    void perform(
      () =>
        gameApi.updateCreature(creature.id, {
          partySlot: null,
          storageSlot: slot,
        }),
      "Creature moved to PC storage.",
    );
  };
  const moveToParty = (creature: Creature) => {
    const occupied = new Set(party.map((item) => item.partySlot));
    let slot = 0;
    for (let candidate = 1; candidate <= 6; candidate++)
      if (!occupied.has(candidate)) {
        slot = candidate;
        break;
      }
    if (!slot) {
      setMessage("Your party is full. Move a creature to storage first.");
      return;
    }
    void perform(
      () =>
        gameApi.updateCreature(creature.id, {
          partySlot: slot,
          storageSlot: null,
        }),
      "Creature added to your party.",
    );
  };

  return (
    <div style={styles.container}>
      <h2 style={{ marginTop: 0 }}>Inventory, Hotbar & Team</h2>
      {message && (
        <div role="status" style={styles.banner}>
          {message}
        </div>
      )}
      <section style={styles.section}>
        <h3>Hotbar Slots (1–9)</h3>
        <p style={styles.hint}>
          Select an item from your bag, then assign it to a slot.
        </p>
        <div style={styles.hotbar}>
          {Array.from({ length: 9 }, (_, index) => index + 1).map((slot) => {
            const equipped = player.hotbarSlots.find(
              (entry) => entry.slot === slot,
            );
            return (
              <div key={slot} style={styles.slot}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <strong>Slot {slot}</strong>
                  {equipped && (
                    <button
                      disabled={busy}
                      onClick={() => clear(slot)}
                      style={styles.clear}
                    >
                      ×
                    </button>
                  )}
                </div>
                <div style={{ minHeight: 34, margin: "8px 0", fontSize: 13 }}>
                  {equipped?.item?.name ?? "— Empty —"}
                </div>
                <button
                  disabled={busy}
                  onClick={() => assign(slot)}
                  style={styles.button}
                >
                  Equip selected
                </button>
              </div>
            );
          })}
        </div>
      </section>
      <section style={styles.section}>
        <h3>Bag ({player.inventory.length} item types)</h3>
        <div style={styles.items}>
          {player.inventory.map((entry) => (
            <button
              key={entry.itemId}
              onClick={() => setSelectedItemId(entry.itemId)}
              style={{
                ...styles.item,
                borderColor:
                  selectedItemId === entry.itemId ? "#38bdf8" : "#334155",
                textAlign: "left",
              }}
            >
              <strong>
                {entry.item?.name ?? `Item #${entry.itemId}`} ×{entry.quantity}
              </strong>
              <small>{entry.item?.category}</small>
            </button>
          ))}
        </div>
        {selected?.item?.category === "medicine" && (
          <div style={{ marginTop: 12 }}>
            <strong>Use {selected.item.name} on:</strong>
            <div style={styles.items}>
              {party.map((creature) => (
                <button
                  key={creature.id}
                  disabled={busy}
                  onClick={() => useMedicine(selected.itemId, creature.id)}
                  style={styles.button}
                >
                  {creature.nickname || creature.species?.name} ·{" "}
                  {creature.currentHp} HP
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
      <div style={styles.columns}>
        <section style={styles.section}>
          <h3>Active Party ({party.length}/6)</h3>
          {party.map((creature) => (
            <div key={creature.id} style={styles.creature}>
              <span>
                <strong>{creature.nickname || creature.species?.name}</strong>
                <small>
                  Lv.{creature.level} · {creature.currentHp} HP
                </small>
              </span>
              <button
                disabled={busy}
                style={styles.button}
                onClick={() => moveToStorage(creature)}
              >
                Send to PC
              </button>
            </div>
          ))}
        </section>
        <section style={styles.section}>
          <h3>PC Storage ({storage.length})</h3>
          {storage.map((creature) => (
            <div key={creature.id} style={styles.creature}>
              <span>
                <strong>{creature.nickname || creature.species?.name}</strong>
                <small>
                  Lv.{creature.level} · Box {creature.storageSlot}
                </small>
              </span>
              <button
                disabled={busy}
                style={styles.button}
                onClick={() => moveToParty(creature)}
              >
                Move to Party
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};
const styles: Record<string, React.CSSProperties> = {
  container: { width: "100%", padding: 4, color: "#f8fafc" },
  section: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  banner: {
    background: "#1e3a8a",
    padding: 10,
    borderRadius: 7,
    marginBottom: 14,
  },
  hint: { color: "#94a3b8", fontSize: 13 },
  hotbar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
    gap: 8,
  },
  slot: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: 10,
  },
  clear: {
    background: "none",
    border: 0,
    color: "#f87171",
    cursor: "pointer",
    fontSize: 18,
  },
  button: {
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#f8fafc",
    borderRadius: 6,
    padding: "7px 9px",
    cursor: "pointer",
  },
  items: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 },
  item: {
    display: "grid",
    gap: 4,
    background: "#0f172a",
    border: "2px solid #334155",
    borderRadius: 8,
    padding: 10,
    color: "#f8fafc",
    cursor: "pointer",
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
    gap: 12,
  },
  creature: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    background: "#0f172a",
    borderRadius: 7,
    padding: 9,
    marginBottom: 7,
  },
};
