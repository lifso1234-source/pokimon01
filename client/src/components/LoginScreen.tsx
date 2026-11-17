import React, { useEffect, useState } from "react";
import { extractApiError } from "../api/axiosClient";
import { gameApi } from "../api/gameApi";
import { usePlayer } from "../context/PlayerContext";
import type { PlayerState, Species } from "../types/game.types";

export const LoginScreen: React.FC = () => {
  const { setPlayer } = usePlayer();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginInput, setLoginInput] = useState("alex");
  const [password, setPassword] = useState("1234");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [starterSpeciesId, setStarterSpeciesId] = useState<number>(1);

  useEffect(() => {
    gameApi
      .listPlayers()
      .then((list) => setPlayers(Array.isArray(list) ? list : []))
      .catch(() => setPlayers([]));

    gameApi
      .listSpecies()
      .then((list) => {
        const safe = Array.isArray(list) ? list : [];
        setSpeciesList(safe);
        if (safe.length > 0) setStarterSpeciesId(safe[0].id);
      })
      .catch(() => setSpeciesList([]));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fullPlayer = await gameApi.login(loginInput.trim(), password);
      setPlayer(fullPlayer);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (p: PlayerState) => {
    setError(null);
    setLoading(true);
    try {
      const fullPlayer = await gameApi.getPlayerState(p.id);
      setPlayer(fullPlayer);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fullPlayer = await gameApi.register({
        email: email.trim(),
        username: username.trim(),
        password: regPassword,
        trainerName: trainerName.trim(),
        starterSpeciesId,
      });
      setPlayer(fullPlayer);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Creature RPG</h2>
        <p style={styles.subtitle}>Sign in as an existing trainer or start a new journey</p>

        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            style={mode === "login" ? styles.activeTab : styles.tab}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            style={mode === "register" ? styles.activeTab : styles.tab}
          >
            New Trainer
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {mode === "login" ? (
          <>
            <form onSubmit={handleLogin} style={styles.form}>
              <label style={styles.label}>
                Username or Email
                <input
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  style={styles.input}
                  required
                />
              </label>

              <label style={styles.label}>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </label>

              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? "Entering World..." : "Enter World"}
              </button>
            </form>

            {(players ?? []).length > 0 && (
              <div style={styles.quickSection}>
                <div style={styles.quickTitle}>Quick Select Trainer</div>
                <div style={styles.quickList}>
                  {(players ?? []).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin(p)}
                      style={styles.quickBtn}
                    >
                      <span>{p.trainerName}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>@{p.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleRegister} style={styles.form}>
            <label style={styles.label}>
              Trainer Name
              <input
                type="text"
                value={trainerName}
                onChange={(e) => setTrainerName(e.target.value)}
                placeholder="Ash"
                style={styles.input}
                required
              />
            </label>

            <label style={styles.label}>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ash_k"
                style={styles.input}
                required
              />
            </label>

            <label style={styles.label}>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ash@example.com"
                style={styles.input}
                required
              />
            </label>

            <label style={styles.label}>
              Password
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                style={styles.input}
                required
              />
            </label>

            <label style={styles.label}>
              Starter Creature
              <select
                value={starterSpeciesId}
                onChange={(e) => setStarterSpeciesId(Number(e.target.value))}
                style={styles.input}
              >
                {(speciesList ?? []).length > 0 ? (
                  (speciesList ?? []).map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} ({sp.type1})
                    </option>
                  ))
                ) : (
                  <option value={1}>Starter #1</option>
                )}
              </select>
            </label>

            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? "Creating Trainer..." : "Create & Start"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    background: "#090d14",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    color: "#f8fafc",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#131b2b",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 24,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#f8fafc",
  },
  subtitle: {
    margin: "6px 0 18px",
    fontSize: 13,
    color: "#94a3b8",
  },
  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
    marginBottom: 16,
    background: "#090d14",
    padding: 4,
    borderRadius: 8,
  },
  tab: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    padding: "8px 0",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  activeTab: {
    background: "#1e293b",
    border: "none",
    color: "#f8fafc",
    padding: "8px 0",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  errorBox: {
    background: "rgba(127, 29, 29, 0.45)",
    border: "1px solid #991b1b",
    color: "#fecaca",
    padding: "8px 10px",
    borderRadius: 6,
    fontSize: 12,
    marginBottom: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    fontSize: 12,
    color: "#cbd5e1",
  },
  input: {
    background: "#090d14",
    border: "1px solid #334155",
    borderRadius: 6,
    padding: "9px 10px",
    color: "#f8fafc",
    fontSize: 13,
  },
  submitBtn: {
    marginTop: 4,
    background: "#2563eb",
    border: "none",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  quickSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTop: "1px solid #1e293b",
  },
  quickTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#64748b",
    marginBottom: 8,
  },
  quickList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  quickBtn: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 6,
    padding: "8px 10px",
    color: "#e2e8f0",
    fontSize: 13,
    cursor: "pointer",
  },
};