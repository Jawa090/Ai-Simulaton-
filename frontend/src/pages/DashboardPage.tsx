import { useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { UnitSummary, DirectionDto, TrackDto, AlertDto, SimulationStateDto } from "../api/types";
import { UnitStatusPanel } from "../components/UnitStatusPanel";
import { SimulationView } from "../components/SimulationView";
import { LiveDetectionsPanel } from "../components/LiveDetectionsPanel";
import { EventStream } from "../components/EventStream";
import { SimulationControls } from "../components/SimulationControls";
import { useSimulationSocket } from "../ws/SimulationSocketContext";
import { useNavigate } from "react-router-dom";

export function DashboardPage() {
  const { data: units, reload: reloadUnits } = usePolling<UnitSummary[]>(() => api.get("/units"), 3000);
  const { data: directions } = usePolling<DirectionDto[]>(() => api.get("/directions"), 5000);
  const { data: tracks } = usePolling<TrackDto[]>(() => api.get("/tracks"), 2000);
  const { data: alerts } = usePolling<AlertDto[]>(() => api.get("/alerts?status=OPEN"), 3000);
  const { data: simState, reload: reloadState } = usePolling<SimulationStateDto>(() => api.get("/simulation/state"), 2000);
  const { events, latestTick } = useSimulationSocket();
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const navigate = useNavigate();

  const activeTrackCount = (tracks ?? []).filter((t) => ["DETECTED", "LOCKED", "TRACKING"].includes(t.status)).length;

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr 220px", gap: 10, height: "100%", padding: 10 }}>
      <div className="panel" style={{ padding: "10px 14px" }}>
        <SimulationControls state={simState} units={units ?? []} onChanged={() => { reloadState(); reloadUnits(); }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 340px", gap: 10, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-header">
            <span>Unit Status</span>
          </div>
          <div className="panel-body scroll-thin">
            <UnitStatusPanel units={units ?? []} />
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 6 }}>SIMULATION SUMMARY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                <span>Session: <span className="mono">{simState?.simulationSessionCode ?? "—"}</span></span>
                <span>State: <span className="mono">{simState?.state ?? "—"}</span></span>
                <span>Speed: <span className="mono">{simState?.speedMultiplier ?? 1}x</span></span>
                <span>Active objects: <span className="mono">{simState?.activeObjectCount ?? 0}</span></span>
                <span>Active tracks: <span className="mono">{activeTrackCount}</span></span>
                <span>Open alerts: <span className="mono" style={{ color: (alerts?.length ?? 0) > 0 ? "var(--danger)" : undefined }}>{alerts?.length ?? 0}</span></span>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span>Simulation View</span>
            <span className="simulation-label">SIMULATION / NOT TO SCALE</span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <SimulationView
              directions={directions ?? []}
              objects={latestTick?.objects ?? []}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span>Live Detections</span>
          </div>
          <div className="panel-body scroll-thin">
            <LiveDetectionsPanel tracks={tracks ?? []} onSelect={(t) => navigate(`/tracks/${t.id}`)} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Live Event Stream</span>
          <span style={{ color: "var(--text-2)" }}>{events.length} events buffered</span>
        </div>
        <div className="panel-body scroll-thin">
          <EventStream events={events} />
        </div>
      </div>
    </div>
  );
}
