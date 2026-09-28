import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { SimulationStateDto, UnitSummary } from "../api/types";

const OBJECT_TYPES = [
  "WIDE_BODY_AIRCRAFT",
  "NARROW_BODY_AIRCRAFT",
  "LOW_RANGE_AIRCRAFT",
  "DRONE",
  "HELICOPTER",
  "QUADCOPTER",
  "SMALL_FLYING_OBJECT",
];

const SPEEDS = [0.5, 1, 2, 5, 10];

export function SimulationControls({ state, units, onChanged }: { state: SimulationStateDto | null; units: UnitSummary[]; onChanged: () => void }) {
  const { user } = useAuth();
  const canControl = user?.role === "ADMIN" || user?.role === "OPERATOR";
  const [busy, setBusy] = useState(false);
  const [objectType, setObjectType] = useState("DRONE");
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const isRunning = state?.state === "RUNNING";
  const isPaused = state?.state === "PAUSED";

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
      <button
        className="primary"
        disabled={!canControl || busy || isRunning}
        onClick={() => run(() => api.post("/simulation/start", { unitId: units[0]?.id }))}
      >
        START
      </button>
      <button disabled={!canControl || busy || !isRunning} onClick={() => run(() => api.post("/simulation/pause"))}>
        PAUSE
      </button>
      <button disabled={!canControl || busy || !isPaused} onClick={() => run(() => api.post("/simulation/resume"))}>
        RESUME
      </button>
      <button disabled={!canControl || busy || state?.state === "STOPPED"} onClick={() => run(() => api.post("/simulation/reset"))}>
        RESET
      </button>

      <select
        disabled={!canControl || busy}
        value={state?.speedMultiplier ?? 1}
        onChange={(e) => run(() => api.post("/simulation/speed", { speedMultiplier: Number(e.target.value) }))}
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}x
          </option>
        ))}
      </select>

      <div style={{ width: 1, height: 20, background: "var(--border)" }} />

      <select disabled={!canControl || busy} value={objectType} onChange={(e) => setObjectType(e.target.value)}>
        {OBJECT_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <button
        disabled={!canControl || busy || !isRunning}
        onClick={() =>
          run(() =>
            api.post("/objects", {
              type: objectType,
              x: 550,
              y: 0,
              z: 150,
              speedUnitsPerSec: 50,
              waypoints: [{ x: -550, y: 0, z: 150 }],
            })
          )
        }
      >
        SPAWN OBJECT
      </button>

      <button
        className="primary"
        disabled={!canControl || busy}
        onClick={() => run(() => api.post("/simulation/demo"))}
      >
        RUN DEMO
      </button>

      {!canControl && <span className="notice">VIEWER role: simulation control is read-only</span>}
      {error && <span style={{ color: "var(--danger)", fontSize: 11 }}>{error}</span>}
    </div>
  );
}
