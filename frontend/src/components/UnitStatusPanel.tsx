import { Link } from "react-router-dom";
import { UnitSummary } from "../api/types";
import { StatusBadge } from "./StatusBadge";

export function UnitStatusPanel({ units }: { units: UnitSummary[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {units.length === 0 && <div className="notice">No units configured. Run the database seed.</div>}
      {units.map((u) => (
        <Link
          key={u.id}
          to={`/units/${u.id}`}
          style={{
            display: "block",
            textDecoration: "none",
            color: "inherit",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "8px 10px",
            background: "var(--bg-2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong className="mono">{u.code}</strong>
            <StatusBadge value={u.status} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>{u.name}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11 }}>
            <span>ANT {u.antennaCount}</span>
            <span>SIG {u.activeSignals}</span>
            <span style={{ color: u.activeTracks > 0 ? "var(--accent)" : undefined }}>TRK {u.activeTracks}</span>
            <span style={{ color: u.openAlerts > 0 ? "var(--danger)" : undefined }}>ALERT {u.openAlerts}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
