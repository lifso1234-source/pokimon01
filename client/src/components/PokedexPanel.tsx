import React, { useEffect, useMemo, useState } from "react";
import { gameApi } from "../api/gameApi";
import type { PokedexStat, Species } from "../types/game.types";

type FilterStatus = "all" | "caught" | "seen" | "unseen";
type SortBy = "dex" | "caught" | "encounters";

interface PokedexPanelProps {
  /** Optional external species list if already loaded in parent state */
  speciesList?: Species[];
  /** Optional callback when a player selects a species entry */
  onSelectSpecies?: (species: Species, stat?: PokedexStat) => void;
}

const TYPE_COLORS: Record<string, string> = {
  normal: "#94a3b8",
  fire: "#f97316",
  water: "#3b82f6",
  grass: "#22c55e",
  electric: "#eab308",
  ice: "#38bdf8",
  fighting: "#ef4444",
  poison: "#a855f7",
  ground: "#d97706",
  flying: "#818cf8",
  psychic: "#ec4899",
  bug: "#84cc16",
  rock: "#a8a29e",
  ghost: "#6366f1",
  dragon: "#7c3aed",
  dark: "#475569",
  steel: "#64748b",
  fairy: "#f472b6",
};

export const PokedexPanel: React.FC<PokedexPanelProps> = ({
  speciesList,
  onSelectSpecies,
}) => {
  const [species, setSpecies] = useState<Species[]>(speciesList ?? []);
  const [stats, setStats] = useState<PokedexStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("dex");
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | null>(
    null,
  );

  const loadPokedex = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedSpecies, fetchedStats] = await Promise.all([
        speciesList ? Promise.resolve(speciesList) : gameApi.listSpecies(),
        gameApi.getPokedex(),
      ]);
      setSpecies(fetchedSpecies);
      setStats(fetchedStats);
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ?? "Failed to load Pokédex data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPokedex();
  }, [speciesList]);

  // Map speciesId -> PokedexStat for O(1) lookup
  const statsBySpecies = useMemo(() => {
    const map = new Map<number, PokedexStat>();
    for (const s of stats) {
      map.set(s.speciesId, {
        ...s,
        timesCaught: Number(s.timesCaught ?? 0),
        timesMissed: Number(s.timesMissed ?? 0),
        encounters: Number(s.encounters ?? 0),
      });
    }
    return map;
  }, [stats]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const sp of species) {
      if (sp.type1) set.add(sp.type1);
      if (sp.type2) set.add(sp.type2);
    }
    return Array.from(set).sort();
  }, [species]);

  const summary = useMemo(() => {
    let caughtCount = 0;
    let seenCount = 0;
    for (const sp of species) {
      const st = statsBySpecies.get(sp.id);
      if (st && st.encounters > 0) seenCount++;
      if (st && st.timesCaught > 0) caughtCount++;
    }
    return { total: species.length, seenCount, caughtCount };
  }, [species, statsBySpecies]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return species
      .map((sp) => ({
        species: sp,
        stat: statsBySpecies.get(sp.id),
      }))
      .filter(({ species: sp, stat }) => {
        const isCaught = (stat?.timesCaught ?? 0) > 0;
        const isSeen = (stat?.encounters ?? 0) > 0;

        if (statusFilter === "caught" && !isCaught) return false;
        if (statusFilter === "seen" && (!isSeen || isCaught)) return false;
        if (statusFilter === "unseen" && isSeen) return false;

        if (
          typeFilter !== "all" &&
          sp.type1 !== typeFilter &&
          sp.type2 !== typeFilter
        ) {
          return false;
        }

        if (query) {
          const matchesDex =
            String(sp.dexNumber).includes(query) ||
            `#${String(sp.dexNumber).padStart(3, "0")}`.includes(query);
          const matchesName = isSeen && sp.name.toLowerCase().includes(query);
          if (!matchesDex && !matchesName) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "caught") {
          return (b.stat?.timesCaught ?? 0) - (a.stat?.timesCaught ?? 0);
        }
        if (sortBy === "encounters") {
          return (b.stat?.encounters ?? 0) - (a.stat?.encounters ?? 0);
        }
        return a.species.dexNumber - b.species.dexNumber;
      });
  }, [species, statsBySpecies, statusFilter, typeFilter, search, sortBy]);

  const selectedEntry = useMemo(
    () =>
      filteredEntries.find((e) => e.species.id === selectedSpeciesId) ??
      species
        .map((sp) => ({ species: sp, stat: statsBySpecies.get(sp.id) }))
        .find((e) => e.species.id === selectedSpeciesId) ??
      null,
    [filteredEntries, species, statsBySpecies, selectedSpeciesId],
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyBox}>Loading Pokédex...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.emptyBox, color: "#f87171" }}>
          <div>{error}</div>
          <button onClick={loadPokedex} style={styles.retryBtn}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header & Completion Counters */}
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Pokédex</h2>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            Track every creature encountered and caught across the world
          </div>
        </div>

        <div style={styles.counters}>
          <div style={styles.counterCard}>
            <span style={styles.counterLabel}>Caught</span>
            <span style={{ ...styles.counterValue, color: "#4ade80" }}>
              {summary.caughtCount} / {summary.total}
            </span>
          </div>
          <div style={styles.counterCard}>
            <span style={styles.counterLabel}>Seen</span>
            <span style={{ ...styles.counterValue, color: "#38bdf8" }}>
              {summary.seenCount} / {summary.total}
            </span>
          </div>
          <button onClick={loadPokedex} style={styles.refreshBtn} title="Refresh">
            ↻
          </button>
        </div>
      </div>

      {/* Search, Status, Type & Sort Toolbar */}
      <div style={styles.toolbar}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or #001..."
          style={styles.searchInput}
        />

        <div style={styles.pillGroup}>
          {(["all", "caught", "seen", "unseen"] as FilterStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                ...styles.pillBtn,
                background: statusFilter === st ? "#2563eb" : "#0f172a",
                borderColor: statusFilter === st ? "#3b82f6" : "#334155",
              }}
            >
              {st === "all"
                ? "All"
                : st === "caught"
                  ? "Caught"
                  : st === "seen"
                    ? "Seen Only"
                    : "Unseen"}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={styles.select}
        >
          <option value="all">All Types</option>
          {availableTypes.map((t) => (
            <option key={t} value={t}>
              {t.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          style={styles.select}
        >
          <option value="dex">Sort: Dex #</option>
          <option value="caught">Sort: Most Caught</option>
          <option value="encounters">Sort: Most Seen</option>
        </select>
      </div>

      {/* Main Grid + Detail Sidebar Layout */}
      <div style={styles.bodyLayout}>
        <div style={styles.grid}>
          {filteredEntries.length === 0 ? (
            <div style={styles.emptyBox}>
              No Pokédex entries match your current filters.
            </div>
          ) : (
            filteredEntries.map(({ species: sp, stat }) => {
              const isCaught = (stat?.timesCaught ?? 0) > 0;
              const isSeen = (stat?.encounters ?? 0) > 0;
              const isSelected = selectedSpeciesId === sp.id;

              return (
                <div
                  key={sp.id}
                  onClick={() => {
                    setSelectedSpeciesId(sp.id);
                    onSelectSpecies?.(sp, stat);
                  }}
                  style={{
                    ...styles.card,
                    borderColor: isSelected
                      ? "#3b82f6"
                      : isCaught
                        ? "#166534"
                        : "#334155",
                    opacity: isSeen ? 1 : 0.65,
                  }}
                >
                  <div style={styles.cardTop}>
                    <span style={styles.dexBadge}>
                      #{String(sp.dexNumber).padStart(3, "0")}
                    </span>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: isCaught
                          ? "rgba(74, 222, 128, 0.15)"
                          : isSeen
                            ? "rgba(56, 189, 248, 0.15)"
                            : "rgba(148, 163, 184, 0.12)",
                        color: isCaught
                          ? "#4ade80"
                          : isSeen
                            ? "#38bdf8"
                            : "#94a3b8",
                      }}
                    >
                      {isCaught ? "CAUGHT" : isSeen ? "SEEN" : "UNKNOWN"}
                    </span>
                  </div>

                  <div style={styles.spriteWrapper}>
                    {sp.spriteUrl ? (
                      <img
                        src={sp.spriteUrl}
                        alt={isSeen ? sp.name : "Unknown creature"}
                        style={{
                          ...styles.sprite,
                          filter: isSeen ? "none" : "brightness(0) invert(0.35)",
                        }}
                      />
                    ) : (
                      <div style={styles.spriteFallback}>?</div>
                    )}
                  </div>

                  <div style={styles.speciesName}>
                    {isSeen ? sp.name : "???"}
                  </div>

                  <div style={styles.typeRow}>
                    {isSeen ? (
                      <>
                        <span
                          style={{
                            ...styles.typeBadge,
                            background: TYPE_COLORS[sp.type1] ?? "#475569",
                          }}
                        >
                          {sp.type1}
                        </span>
                        {sp.type2 && (
                          <span
                            style={{
                              ...styles.typeBadge,
                              background: TYPE_COLORS[sp.type2] ?? "#475569",
                            }}
                          >
                            {sp.type2}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        Not yet encountered
                      </span>
                    )}
                  </div>

                  {isSeen && stat && (
                    <div style={styles.miniStats}>
                      <span>Seen: {stat.encounters}</span>
                      <span>Caught: {stat.timesCaught}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Selected Entry Detail Card */}
        {selectedEntry && (
          <div style={styles.detailPane}>
            {(() => {
              const { species: sp, stat } = selectedEntry;
              const isSeen = (stat?.encounters ?? 0) > 0;
              const isCaught = (stat?.timesCaught ?? 0) > 0;

              return (
                <>
                  <div style={styles.detailHeader}>
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>
                      #{String(sp.dexNumber).padStart(3, "0")}
                    </span>
                    <button
                      onClick={() => setSelectedSpeciesId(null)}
                      style={styles.closeBtn}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ textAlign: "center", margin: "8px 0 12px" }}>
                    {sp.spriteUrl && (
                      <img
                        src={sp.spriteUrl}
                        alt={isSeen ? sp.name : "Unknown"}
                        style={{
                          width: 96,
                          height: 96,
                          imageRendering: "pixelated",
                          filter: isSeen ? "none" : "brightness(0) invert(0.35)",
                        }}
                      />
                    )}
                    <h3 style={{ margin: "6px 0 4px" }}>
                      {isSeen ? sp.name : "???"}
                    </h3>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {isCaught
                        ? "Registered in Pokédex"
                        : isSeen
                          ? "Seen in the wild (not yet caught)"
                          : "Undiscovered species"}
                    </div>
                  </div>

                  {isSeen ? (
                    <>
                      <div style={styles.detailSection}>
                        <div style={styles.detailSectionTitle}>
                          Encounter Records
                        </div>
                        <div style={styles.statRow}>
                          <span>Total Encounters</span>
                          <strong>{stat?.encounters ?? 0}</strong>
                        </div>
                        <div style={styles.statRow}>
                          <span>Times Caught</span>
                          <strong style={{ color: "#4ade80" }}>
                            {stat?.timesCaught ?? 0}
                          </strong>
                        </div>
                        <div style={styles.statRow}>
                          <span>Times Missed</span>
                          <strong style={{ color: "#f87171" }}>
                            {stat?.timesMissed ?? 0}
                          </strong>
                        </div>
                        {stat?.firstSeenAt && (
                          <div style={styles.statRow}>
                            <span>First Seen</span>
                            <span style={{ fontSize: 12, color: "#cbd5e1" }}>
                              {new Date(stat.firstSeenAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div style={styles.detailSection}>
                        <div style={styles.detailSectionTitle}>Base Stats</div>
                        {[
                          ["HP", sp.baseHp],
                          ["Attack", sp.baseAttack],
                          ["Defense", sp.baseDefense],
                          ["Sp. Atk", sp.baseSpAttack],
                          ["Sp. Def", sp.baseSpDefense],
                          ["Speed", sp.baseSpeed],
                        ].map(([label, val]) => (
                          <div key={String(label)} style={{ marginBottom: 6 }}>
                            <div style={styles.statRow}>
                              <span style={{ fontSize: 12 }}>{label}</span>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>
                                {val}
                              </span>
                            </div>
                            <div style={styles.barTrack}>
                              <div
                                style={{
                                  ...styles.barFill,
                                  width: `${Math.min(100, (Number(val) / 160) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                      Explore different terrains and battle wild creatures to
                      unlock data for this species.
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 20,
    color: "#f8fafc",
    background: "#0f172a",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  counters: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  counterCard: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "8px 14px",
    display: "flex",
    flexDirection: "column",
  },
  counterLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  counterValue: {
    fontSize: 16,
    fontWeight: 700,
  },
  refreshBtn: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#f8fafc",
    borderRadius: 8,
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: 16,
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
    background: "#1e293b",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #334155",
  },
  searchInput: {
    flex: "1 1 180px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 6,
    padding: "8px 10px",
    color: "#f8fafc",
    fontSize: 13,
  },
  pillGroup: {
    display: "flex",
    gap: 6,
  },
  pillBtn: {
    padding: "7px 11px",
    borderRadius: 6,
    border: "1px solid #334155",
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  select: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 6,
    padding: "8px 10px",
    color: "#f8fafc",
    fontSize: 12,
  },
  bodyLayout: {
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
  },
  grid: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))",
    gap: 12,
  },
  card: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: 12,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "border-color 0.15s ease",
  },
  cardTop: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dexBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: "#94a3b8",
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 4,
  },
  spriteWrapper: {
    height: 72,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "6px 0",
  },
  sprite: {
    width: 68,
    height: 68,
    imageRendering: "pixelated",
  },
  spriteFallback: {
    fontSize: 28,
    color: "#64748b",
  },
  speciesName: {
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 6,
  },
  typeRow: {
    display: "flex",
    gap: 4,
    minHeight: 18,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    padding: "2px 7px",
    borderRadius: 999,
    color: "#fff",
  },
  miniStats: {
    marginTop: 8,
    paddingTop: 6,
    borderTop: "1px solid #334155",
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    color: "#94a3b8",
  },
  detailPane: {
    width: 280,
    flexShrink: 0,
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: 16,
    position: "sticky",
    top: 16,
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: 15,
  },
  detailSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid #334155",
  },
  detailSectionTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#94a3b8",
    marginBottom: 8,
    fontWeight: 700,
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    marginBottom: 4,
  },
  barTrack: {
    height: 6,
    background: "#0f172a",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: "#3b82f6",
    borderRadius: 999,
  },
  emptyBox: {
    gridColumn: "1 / -1",
    padding: 32,
    textAlign: "center",
    background: "#1e293b",
    borderRadius: 10,
    border: "1px solid #334155",
    color: "#94a3b8",
  },
  retryBtn: {
    marginTop: 10,
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #475569",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
  },
};