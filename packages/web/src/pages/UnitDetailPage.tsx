import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { UnitDetailDto } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";

export function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: unit } = usePolling<UnitDetailDto>(() => api.get(`/units/${id}`), 3000, [id]);

  if (!unit) return <div style={{ padding: 16 }}>Loading unit...</div>;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, height: "100%", overflow: "auto" }} className="scroll-thin">
      <div className="panel" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="mono" style={{ margin: 0 }}>
            {unit.code} — {unit.name}
          </h2>
          <StatusBadge value={unit.status} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginTop: 14, fontSize: 12 }}>
          <Field label="ANTENNAS" value={unit.antennas.length} />
          <Field label="DIRECTIONS" value={unit.directions.length} />
          <Field label="SIGNALS" value={unit.signals.length} />
          <Field label="ACTIVE SIGNALS" value={unit.signals.filter((s) => s.status !== "IDLE" && s.enabled).length} />
          <Field label="ACTIVE TRACKS" value={unit.activeTracks} />
        </div>
      </div>

      <div className="panel" style={{ padding: 14 }}>
        <div className="panel-header" style={{ padding: 0, border: 0, marginBottom: 10 }}>
          DIRECTION STATUS
        </div>
        <table>
          <thead>
            <tr>
              <th>Direction</th>
              <th>Azimuth</th>
              <th>Sector Width</th>
              <th>Range</th>
              <th>Antennas</th>
              <th>Signals</th>
            </tr>
          </thead>
          <tbody>
            {unit.directions.map((d) => {
              const dirAntennas = unit.antennas.filter((a) => a.directionId === d.id);
              const dirSignals = unit.signals.filter((s) => s.directionId === d.id);
              return (
                <tr key={d.id}>
                  <td className="mono">{d.code}</td>
                  <td className="mono">{d.azimuthCenterDeg}°</td>
                  <td className="mono">{d.sectorWidthDeg}°</td>
                  <td className="mono">{d.rangeUnits}</td>
                  <td>{dirAntennas.map((a) => a.code).join(", ")}</td>
                  <td>
                    {dirSignals.map((s) => (
                      <span key={s.id} style={{ marginRight: 8 }}>
                        {s.frequencyHz.toFixed(1)}Hz <StatusBadge value={s.status} />
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
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
