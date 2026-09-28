import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { DirectionDto, TrackDto, AlertDto, SimulationStateDto, UnitSummary } from "../api/types";
import { SimulationView } from "../components/SimulationView";
import { EventStream } from "../components/EventStream";
import { useSimulationSocket } from "../ws/SimulationSocketContext";
import { useAuth } from "../auth/AuthContext";
import { ReactNode, useState } from "react";
import { StatusBadge } from "../components/StatusBadge";

export function PresentationPage() {
  const { user } = useAuth();
  const canControl = user?.role === "ADMIN" || user?.role === "OPERATOR";
  const { data: units } = usePolling<UnitSummary[]>(() => api.get("/units"), 5000);
  const { data: directions } = usePolling<DirectionDto[]>(() => api.get("/directions"), 5000);
  const { data: tracks } = usePolling<TrackDto[]>(() => api.get("/tracks"), 1500);
  const { data: alerts } = usePolling<AlertDto[]>(() => api.get("/alerts?status=OPEN"), 2500);
  const { data: simState } = usePolling<SimulationStateDto>(() => api.get("/simulation/state"), 2000);
  const { events, latestTick } = useSimulationSocket();
  const [busy, setBusy] = useState(false);

  const primaryTrack = (tracks ?? []).find((t) => ["LOCKED", "TRACKING"].includes(t.status));

  async function startDemo() {
    setBusy(true);
    try {
      await api.post("/simulation/demo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gridTemplateRows: "1fr 180px", gap: 12, height: "100%", padding: 12 }}>
      <div className="panel" style={{ gridRow: "1 / 2" }}>
        <div className="panel-header">
          <span>EIGHTH AVITRONICS — {units?.[0]?.code ?? "UNIT-01"}</span>
          <span className="simulation-label">SIMULATION / NOT TO SCALE</span>
        </div>
        <div className="panel-body" style={{ padding: 0, position: "relative" }}>
          <SimulationView directions={directions ?? []} objects={latestTick?.objects ?? []} />
          <div style={{ position: "absolute", top: 10, left: 10 }}>
            <button className="primary" disabled={!canControl || busy} onClick={startDemo} style={{ fontSize: 15, padding: "10px 22px" }}>
              START DEMO
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ gridRow: "1 / 2" }}>
        <div className="panel-header">Status</div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Row label="System status" value={<StatusBadge value={simState?.state ?? "STOPPED"} />} />
          <Row label="Open alerts" value={<span style={{ color: (alerts?.length ?? 0) > 0 ? "var(--danger)" : undefined }}>{alerts?.length ?? 0}</span>} />
          {primaryTrack && (
            <>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, fontSize: 11, color: "var(--text-2)" }}>ACTIVE TRACK</div>
              <Row label="Track" value={<span className="mono">{primaryTrack.code}</span>} />
              <Row label="Object" value={primaryTrack.object?.label ?? primaryTrack.object?.type ?? "—"} />
              <Row label="Status" value={<StatusBadge value={primaryTrack.status} />} />
              <Row label="X / Y / Z" value={<span className="mono">{Math.round(primaryTrack.currentX)}, {Math.round(primaryTrack.currentY)}, {Math.round(primaryTrack.currentZ)}</span>} />
              <Row label="T (ms)" value={<span className="mono">{Math.round(primaryTrack.currentT)}</span>} />
            </>
          )}
          {alerts && alerts.length > 0 && (
            <>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, fontSize: 11, color: "var(--text-2)" }}>ALERT — HUMAN REVIEW REQUIRED</div>
              <div style={{ fontSize: 12 }}>{alerts[0].reason}</div>
            </>
          )}
        </div>
      </div>

      <div className="panel" style={{ gridColumn: "1 / 3" }}>
        <div className="panel-header">Live Event Stream</div>
        <div className="panel-body scroll-thin">
          <EventStream events={events} limit={30} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "var(--text-2)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
