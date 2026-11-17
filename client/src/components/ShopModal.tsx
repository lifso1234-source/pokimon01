import React, { useEffect, useState } from "react";
import { extractApiError } from "../api/axiosClient";
import { gameApi } from "../api/gameApi";
import { usePlayer } from "../context/PlayerContext";
import type { Npc, NpcShopItem } from "../types/game.types";

interface Props { npc: Npc; onClose: () => void; }
export const ShopModal: React.FC<Props> = ({ npc, onClose }) => {
  const { player, refreshPlayer } = usePlayer();
  const [listings, setListings] = useState<NpcShopItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    gameApi.getNpcShop(npc.id).then((data) => { if (live) setListings(Array.isArray(data) ? data : data?.data ?? []); })
      .catch((error) => { if (live) setMessage(extractApiError(error)); });
    return () => { live = false; };
  }, [npc.id]);
  if (!player) return null;
  const trade = async (kind: "buy" | "sell", itemId: number) => {
    setBusy(true); setMessage("");
    try {
      if (kind === "buy") await gameApi.buyFromNpc(npc.id, player.id, itemId, 1);
      else await gameApi.sellToNpc(npc.id, player.id, itemId, 1);
      await refreshPlayer(); setMessage(kind === "buy" ? "Purchase complete." : "Item sold.");
    } catch (error) { setMessage(extractApiError(error)); }
    finally { setBusy(false); }
  };
  return <div style={styles.overlay}><div style={styles.modal}>
    <header style={styles.header}><strong>{npc.name}'s Shop</strong><strong style={{ color: "#4ade80" }}>${player.money}</strong></header>
    {message && <div style={styles.message}>{message}</div>}
    {!listings.length && !message && <p>Loading shop inventory…</p>}
    {listings.map((entry) => {
      const owned = player.inventory.find((item) => item.itemId === entry.itemId)?.quantity ?? 0;
      return <div key={entry.itemId} style={styles.row}><div><strong>{entry.item?.name ?? `Item #${entry.itemId}`}</strong><small>Owned: {owned} · Buy ${entry.price} · Sell ${entry.item?.sellPrice ?? 0}</small></div><div style={{ display: "flex", gap: 6 }}><button disabled={busy || player.money < entry.price} onClick={() => void trade("buy", entry.itemId)} style={styles.buy}>Buy</button><button disabled={busy || owned < 1} onClick={() => void trade("sell", entry.itemId)} style={styles.sell}>Sell</button></div></div>;
    })}
    <button onClick={onClose} style={styles.close}>Close</button>
  </div></div>;
};
const styles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(2,6,23,.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 16 },
  modal: { width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", background: "#1e293b", border: "1px solid #475569", borderRadius: 12, padding: 20, color: "#f8fafc" },
  header: { display: "flex", justifyContent: "space-between", marginBottom: 14 }, message: { padding: 9, borderRadius: 6, background: "#0f172a", color: "#7dd3fc", marginBottom: 10 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#0f172a", padding: 10, borderRadius: 8, marginBottom: 8 },
  buy: { padding: "7px 11px", border: 0, borderRadius: 6, background: "#22c55e", color: "#052e16", cursor: "pointer" }, sell: { padding: "7px 11px", border: "1px solid #64748b", borderRadius: 6, background: "transparent", color: "white", cursor: "pointer" },
  close: { width: "100%", marginTop: 12, padding: 9, borderRadius: 6, border: "1px solid #475569", background: "transparent", color: "white", cursor: "pointer" },
};
