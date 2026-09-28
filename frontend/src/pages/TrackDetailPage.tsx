import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { StatusBadge } from "../components/StatusBadge";

interface TrackPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  t: number;
  estimatedX: number;
  estimatedY: number;
  estimatedZ: number;
  recordedAt: string;
}

interface TrackFull {
  id: string;
  code: string;
  status: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  currentX: number;
  currentY: number;
  currentZ: number;
  currentT: number;
  estimatedSpeed: number;
  estimatedDirectionDeg: number;
  detectionCount: number;
  object: { type: string; label: string };
  direction: { code: string } | null;
  antenna: { code: string } | null;
  unit: { code: string };
}

export function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: track } = usePolling<TrackFull>(() => api.get(`/tracks/${id}`), 2000, [id]);
  const { data: points } = usePolling<TrackPoint[]>(() => api.get(`/tracks/${id}/history`), 2000, [id]);

  if (!track) return <div style={{ padding: 16 }}>Loading track...</div>;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, height: "100%", overflow: "auto" }} className="scroll-thin">
      <div className="panel" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }} className="mono">
            {track.code}
          </h2>
          <StatusBadge value={track.status} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 14, fontSize: 12 }}>
          <Field label="OBJECT TYPE" value={track.object?.type?.replace(/_/g, " ") ?? "—"} />
          <Field label="FIRST DETECTED" value={new Date(track.firstDetectedAt).toLocaleTimeString()} />
          <Field label="LAST UPDATED" value={new Date(track.lastDetectedAt).toLocaleTimeString()} />
          <Field label="DETECTIONS" value={String(track.detectionCount)} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="panel" style={{ padding: 14 }}>
          <div className="panel-header" style={{ padding: 0, border: 0, marginBottom: 10 }}>
            POSITION (SIMULATED / ESTIMATED)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, fontSize: 12 }}>
            <Field label="X" value={Math.round(track.currentX)} />
            <Field label="Y" value={Math.round(track.currentY)} />
            <Field label="Z (ALT)" value={Math.round(track.currentZ)} />
            <Field label="T (ms)" value={Math.round(track.currentT)} />
          </div>
          <div className="notice" style={{ marginTop: 10 }}>SIMULATED / ESTIMATED / NOT FOR OPERATIONAL USE</div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <div className="panel-header" style={{ padding: 0, border: 0, marginBottom: 10 }}>
            MOVEMENT &amp; SIGNAL ASSOCIATION
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, fontSize: 12 }}>
            <Field label="SPEED (units/sec)" value={track.estimatedSpeed.toFixed(1)} />
            <Field label="HEADING (deg)" value={track.estimatedDirectionDeg.toFixed(1)} />
            <Field label="UNIT" value={track.unit?.code ?? "—"} />
            <Field label="DIRECTION" value={track.direction?.code ?? "—"} />
            <Field label="ANTENNA" value={track.antenna?.code ?? "—"} />
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: 14 }}>
        <div className="panel-header" style={{ padding: 0, border: 0, marginBottom: 10 }}>
          TRACK HISTORY / TRAJECTORY ({points?.length ?? 0} points)
        </div>
        <table>
          <thead>
            <tr>
              <th>Recorded</th>
              <th>X</th>
              <th>Y</th>
              <th>Z</th>
              <th>Estimated X/Y/Z</th>
            </tr>
          </thead>
          <tbody>
            {(points ?? []).slice(-30).reverse().map((p) => (
              <tr key={p.id}>
                <td className="mono">{new Date(p.recordedAt).toLocaleTimeString()}</td>
                <td className="mono">{p.x.toFixed(1)}</td>
                <td className="mono">{p.y.toFixed(1)}</td>
                <td className="mono">{p.z.toFixed(1)}</td>
                <td className="mono">
                  {p.estimatedX.toFixed(1)}, {p.estimatedY.toFixed(1)}, {p.estimatedZ.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-2)", letterSpacing: "0.05em" }}>{label}</div>
      <div className="mono" style={{ fontSize: 14 }}>
        {value}
      </div>
    </div>
  );
}
