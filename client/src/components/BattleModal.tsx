
import React, { useEffect, useState } from "react";
import { extractApiError } from "../api/axiosClient";
import { gameApi } from "../api/gameApi";
import { usePlayer } from "../context/PlayerContext";
import type { Battle, Move } from "../types/game.types";

interface Props {
  battle: Battle;
  onBattleUpdate: (battle: Battle | null) => void;
}

export const BattleModal: React.FC<Props> = ({
  battle,
  onBattleUpdate,
}) => {
  const { player, refreshPlayer } = usePlayer();

  const [moves, setMoves] = useState<Record<number, Move>>({});
  const [logs, setLogs] = useState<string[]>([
    battle.kind === "npc"
      ? `${battle.npc?.name ?? "Trainer"} challenged you!`
      : "A wild creature appeared!",
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;

    gameApi.listMoves()
      .then((all) => {
        if (live) {
          setMoves(
            Object.fromEntries(
              all.map((move) => [move.id, move])
            )
          );
        }
      })
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, []);

  if (!player) return null;

  const active = battle.creatures.find(
    (c) => c.side === 1 && c.isActive
  );

  const foe = battle.creatures.find(
    (c) => c.side === 2 && c.isActive
  );

  const team = battle.creatures
    .filter((c) => c.side === 1)
    .sort((a, b) => a.partyPosition - b.partyPosition);

  const balls = player.inventory.filter(
    (entry) => entry.item?.category === "ball" && entry.quantity > 0
  );

  const medicine = player.inventory.filter(
    (entry) =>
      entry.item?.category === "medicine" &&
      entry.quantity > 0
  );

  const finished = battle.status !== "active";

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");

    try {
      await action();
    } catch (err) {
      const message = extractApiError(err);
      setError(message);
      setLogs((old) => [...old, message]);
    } finally {
      setBusy(false);
    }
  };

  const attack = (moveId: number) =>
    run(async () => {
      const result = await gameApi.battleAttack(
        battle.id,
        moveId
      );

      setLogs((old) => [...old, ...(result.log ?? [])]);
      onBattleUpdate(result.battle);

      if (result.battle.status !== "active") {
        await refreshPlayer();
      }
    });

  const switchTo = (partyPosition: number) =>
    run(async () => {
      const updated = await gameApi.battleSwitch(
        battle.id,
        partyPosition
      );

      setLogs((old) => [
        ...old,
        "Switched your active creature.",
      ]);

      onBattleUpdate(updated);
    });

  const useItem = (itemId: number, name: string) =>
    run(async () => {
      const result = await gameApi.battleUseItem(
        battle.id,
        {
          itemId,
          targetPartyPosition: active?.partyPosition,
        }
      );

      setLogs((old) => [
        ...old,
        result.caught
          ? `${foe?.species?.name ?? "Creature"} was caught!`
          : result.message ?? `Used ${name}.`,
      ]);

      onBattleUpdate(result.battle);
      await refreshPlayer();
    });

  // FIX: Successfully fleeing immediately closes the battle modal.
  const flee = () =>
    run(async () => {
      await gameApi.battleFlee(battle.id);

      // Clear the active battle in App.tsx.
      onBattleUpdate(null);

      // Refresh player data without preventing the modal from closing.
      void refreshPlayer().catch(() => undefined);
    });

  const close = async () => {
    try {
      if (battle.status === "lost") {
        await gameApi.healParty(player.id);
      }

      await refreshPlayer();
      onBattleUpdate(null);
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <header style={styles.header}>
          <strong>
            {battle.kind === "wild"
              ? "Wild Encounter"
              : `Trainer Battle: ${battle.npc?.name ?? "Trainer"}`}
            {" "}· Turn {battle.turnNumber}
          </strong>

          <span>{battle.status.toUpperCase()}</span>
        </header>

        <div style={styles.arena}>
          {foe && (
            <Fighter
              title="OPPONENT"
              name={
                foe.species?.name ??
                `Creature #${foe.speciesId}`
              }
              level={foe.level}
              hp={foe.currentHp}
              max={foe.maxHp}
            />
          )}

          {active && (
            <Fighter
              title="YOUR ACTIVE"
              name={
                active.species?.name ??
                `Creature #${active.speciesId}`
              }
              level={active.level}
              hp={active.currentHp}
              max={active.maxHp}
            />
          )}
        </div>

        <div style={styles.logs}>
          {logs.slice(-6).map((line, index) => (
            <div key={`${index}-${line}`}>
              • {line}
            </div>
          ))}
        </div>

        {error && (
          <p style={{ color: "#fca5a5" }}>
            {error}
          </p>
        )}

        {finished ? (
          <button
            style={styles.primary}
            onClick={() => void close()}
            disabled={busy}
          >
            {battle.status === "lost"
              ? "Respawn & Heal"
              : "Return to Map"}
          </button>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <section>
              <strong>Attacks</strong>

              <div style={styles.grid}>
                {(active?.moves ?? []).map((move) => (
                  <button
                    key={move.move_id}
                    disabled={busy || move.pp <= 0}
                    style={styles.action}
                    onClick={() => void attack(move.move_id)}
                  >
                    {moves[move.move_id]?.name ??
                      `Move #${move.move_id}`}
                    {" "}· {move.pp} PP
                  </button>
                ))}
              </div>
            </section>

            <section>
              <strong>Bag</strong>

              <div style={styles.grid}>
                {battle.kind === "wild" &&
                  balls.map((entry) => (
                    <button
                      key={entry.itemId}
                      disabled={busy}
                      style={styles.action}
                      onClick={() =>
                        void useItem(
                          entry.itemId,
                          entry.item?.name ?? "Ball"
                        )
                      }
                    >
                      Throw {entry.item?.name} ×{entry.quantity}
                    </button>
                  ))}

                {medicine.map((entry) => (
                  <button
                    key={entry.itemId}
                    disabled={busy}
                    style={styles.action}
                    onClick={() =>
                      void useItem(
                        entry.itemId,
                        entry.item?.name ?? "Medicine"
                      )
                    }
                  >
                    Use {entry.item?.name} ×{entry.quantity}
                  </button>
                ))}
              </div>
            </section>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {team
                .filter(
                  (creature) =>
                    !creature.isActive &&
                    creature.currentHp > 0
                )
                .map((creature) => (
                  <button
                    key={creature.id}
                    disabled={busy}
                    style={styles.action}
                    onClick={() =>
                      void switchTo(creature.partyPosition)
                    }
                  >
                    Switch to{" "}
                    {creature.species?.name ?? "Creature"}
                  </button>
                ))}

              {battle.kind === "wild" && (
                <button
                  disabled={busy}
                  style={{
                    ...styles.flee,
                    opacity: busy ? 0.5 : 1,
                  }}
                  onClick={() => void flee()}
                >
                  {busy ? "Escaping..." : "Flee"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Fighter: React.FC<{
  title: string;
  name: string;
  level: number;
  hp: number;
  max: number;
}> = ({ title, name, level, hp, max }) => (
  <div style={styles.fighter}>
    <small>{title}</small>
    <strong>
      {name} · Lv.{level}
    </strong>

    <div style={styles.hpTrack}>
      <div
        style={{
          width: `${
            Math.max(
              0,
              Math.min(100, (hp / Math.max(1, max)) * 100)
            )
          }%`,
          height: "100%",
          background:
            hp / Math.max(1, max) > 0.5
              ? "#22c55e"
              : "#ef4444",
        }}
      />
    </div>

    <small>
      {hp} / {max} HP
    </small>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,.86)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 16,
    overflowY: "auto",
  },
  modal: {
    width: "100%",
    maxWidth: 650,
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#1e293b",
    border: "1px solid #475569",
    borderRadius: 12,
    padding: 20,
    color: "#f8fafc",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  arena: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  fighter: {
    background: "#0f172a",
    borderRadius: 8,
    padding: 12,
    display: "grid",
    gap: 6,
  },
  hpTrack: {
    height: 9,
    borderRadius: 5,
    background: "#334155",
    overflow: "hidden",
  },
  logs: {
    background: "#0f172a",
    borderRadius: 8,
    padding: 10,
    margin: "14px 0",
    fontSize: 13,
    lineHeight: 1.7,
    maxHeight: 110,
    overflowY: "auto",
  },
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 8,
  },
  action: {
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#f8fafc",
    padding: "8px 10px",
    borderRadius: 7,
    cursor: "pointer",
  },
  primary: {
    width: "100%",
    padding: 11,
    border: 0,
    borderRadius: 7,
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  },
  flee: {
    border: "1px solid #f87171",
    background: "transparent",
    color: "#fca5a5",
    padding: "8px 12px",
    borderRadius: 7,
    cursor: "pointer",
  },
};
