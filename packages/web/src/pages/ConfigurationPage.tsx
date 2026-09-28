import { useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { SignalDto, UnitSummary } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../auth/AuthContext";

interface ConfigDto {
  signalFrequencyRangeHz: { min: number; max: number };
  objectProfiles: Array<{ type: string; label: string; minAltitudeUnits: number; maxAltitudeUnits: number; defaultSpeedUnitsPerSec: number; note: string }>;
  note: string;
}

interface AuditRow {
  id: string;
  userLabel: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
}

export function ConfigurationPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "OPERATOR";
  const { data: units } = usePolling<UnitSummary[]>(() => api.get("/units"), 5000);
  const unitId = units?.[0]?.id;
  const { data: signals, reload } = usePolling<SignalDto[]>(() => (unitId ? api.get(`/signals?unitId=${unitId}`) : Promise.resolve([])), 3000, [unitId]);
  const { data: config } = usePolling<ConfigDto>(() => api.get("/config"), 10000);
  const { data: audit } = usePolling<AuditRow[]>(() => api.get("/audit"), 4000);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function saveFrequency(signal: SignalDto) {
    const raw = editing[signal.id];
    if (raw === undefined) return;
    const value = Number(raw);
    setError(null);
    try {
      await api.patch(`/signals/${signal.id}`, { frequencyHz: value });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function toggleEnabled(signal: SignalDto) {
    await api.patch(`/signals/${signal.id}`, { enabled: !signal.enabled });
    reload();
  }

  return (
    <div style={{ padding: 16, height: "100%", overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }} className="scroll-thin">
      <h2 style={{ margin: 0 }}>Configuration</h2>
      <div className="notice">
        {config?.note ?? "All values are SIMULATION PARAMETERS. ENGINEERING VALIDATION REQUIRED before operational use."}
      </div>

      <div className="panel" style={{ padding: 14 }}>
        <div className="panel-header" style={{ padding: 0, border: 0, marginBottom: 10 }}>
          Signal Configuration — range {config?.signalFrequencyRangeHz.min ?? "—"}–{config?.signalFrequencyRangeHz.max ?? "—"} Hz
        </div>
        {error && <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <table>
          <thead>
            <tr>
              <th>Signal</th>
              <th>Direction</th>
              <th>Antenna</th>
              <th>Layer</th>
              <th>Frequency (Hz)</th>
              <th>Status</th>
              <th>Enabled</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(signals ?? []).map((s) => (
              <tr key={s.id}>
                <td className="mono">{s.id.slice(0, 8)}</td>
                <td className="mono">{s.direction?.code ?? "—"}</td>
                <td className="mono">{s.antenna?.code ?? "—"}</td>
                <td>{s.layer?.name ?? "—"}</td>
                <td>
                  {canEdit ? (
                    <input
                      style={{ width: 90 }}
                      defaultValue={s.frequencyHz}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    />
                  ) : (
                    <span className="mono">{s.frequencyHz}</span>
                  )}
                </td>
                <td><StatusBadge value={s.status} /></td>
                <td><StatusBadge value={s.enabled ? "ACTIVE" : "DISABLED"} /></td>
                {canEdit && (
                  <td style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => saveFrequency(s)}>Save</button>
                    <button onClick={() => toggleEnabled(s)}>{s.enabled ? "Disable" : "Enable"}</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ padding: 14 }}>
        <div className="panel-header" style={{ padding: 0, border: 0, marginBottom: 10 }}>
          Object Profiles (Simulation Parameters)
        </div>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Altitude Band (units)</th>
              <th>Default Speed</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {(config?.objectProfiles ?? []).map((p) => (
              <tr key={p.type}>
                <td>{p.label}</td>
                <td className="mono">{p.minAltitudeUnits}–{p.maxAltitudeUnits}</td>
                <td className="mono">{p.defaultSpeedUnitsPerSec}/s</td>
                <td style={{ color: "var(--text-2)", whiteSpace: "normal", maxWidth: 320 }}>{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ padding: 14 }}>
        <div className="panel-header" style={{ padding: 0, border: 0, marginBottom: 10 }}>
          Configuration Change Audit Trail
        </div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Old</th>
              <th>New</th>
            </tr>
          </thead>
          <tbody>
            {(audit ?? []).slice(0, 40).map((row) => (
              <tr key={row.id}>
                <td className="mono">{new Date(row.timestamp).toLocaleTimeString()}</td>
                <td>{row.userLabel}</td>
                <td>{row.action}</td>
                <td className="mono">{row.entityType}:{row.entityId.slice(0, 8)}</td>
                <td className="mono" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{row.oldValue ?? "—"}</td>
                <td className="mono" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{row.newValue ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
