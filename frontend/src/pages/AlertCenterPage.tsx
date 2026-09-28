import { useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { AlertDto } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../auth/AuthContext";

const STATUSES = ["OPEN", "UNDER_REVIEW", "ACKNOWLEDGED", "CLOSED"];

export function AlertCenterPage() {
  const { user } = useAuth();
  const canReview = user?.role === "ADMIN" || user?.role === "OPERATOR";
  const [filter, setFilter] = useState<string>("ALL");
  const { data: alerts, reload } = usePolling<AlertDto[]>(() => api.get("/alerts"), 2500);

  const filtered = (alerts ?? []).filter((a) => filter === "ALL" || a.status === filter);

  async function setStatus(id: string, status: string) {
    await api.patch(`/alerts/${id}`, { status });
    reload();
  }

  return (
    <div style={{ padding: 16, height: "100%", overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }} className="scroll-thin">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Alert Center</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {["ALL", ...STATUSES].map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{ borderColor: filter === s ? "var(--accent)" : undefined, color: filter === s ? "var(--accent)" : undefined }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="notice">
        This is a SIMULATION alert stream. No automatic real-world action is ever taken — every alert requires human review.
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Alert</th>
              <th>Track</th>
              <th>Object</th>
              <th>Unit / Direction</th>
              <th>Position</th>
              <th>Severity</th>
              <th>Reason</th>
              <th>Status</th>
              {canReview && <th>Review</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="notice">No alerts.</td>
              </tr>
            )}
            {filtered.map((a) => (
              <tr key={a.id}>
                <td className="mono">{a.code}</td>
                <td className="mono">{a.track?.code ?? "—"}</td>
                <td>{a.objectType.replace(/_/g, " ")}</td>
                <td className="mono">{a.direction?.code ?? "—"}</td>
                <td className="mono">{Math.round(a.x)}, {Math.round(a.y)}, {Math.round(a.z)}</td>
                <td><StatusBadge value={a.severity} kind="severity" /></td>
                <td style={{ maxWidth: 260, whiteSpace: "normal" }}>{a.reason}</td>
                <td><StatusBadge value={a.status} /></td>
                {canReview && (
                  <td>
                    <select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
