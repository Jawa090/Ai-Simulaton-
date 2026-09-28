import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { UnitDetailDto, UnitSummary } from "../api/types";

interface LayerDto {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

export function AntennaViewPage() {
  const { data: units } = usePolling<UnitSummary[]>(() => api.get("/units"), 5000);
  const unitId = units?.[0]?.id;
  const { data: unit } = usePolling<UnitDetailDto>(() => (unitId ? api.get(`/units/${unitId}`) : Promise.resolve(null as never)), 5000, [unitId]);
  const { data: layers } = usePolling<LayerDto[]>(() => api.get("/layers"), 10000);

  if (!unit || !layers) return <div style={{ padding: 16 }}>Loading antenna configuration...</div>;

  const omni = unit.antennas.find((a) => a.isOmni);
  const directionalLayers = layers.filter((l) => l.code !== "LAYER_1_OMNI").sort((a, b) => a.sortOrder - b.sortOrder);
  const omniLayer = layers.find((l) => l.code === "LAYER_1_OMNI");

  return (
    <div style={{ padding: 16, height: "100%", overflow: "auto" }} className="scroll-thin">
      <div className="panel" style={{ padding: 14, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0 }}>Antenna / Unit Schematic — {unit.code}</h2>
        <p style={{ color: "var(--text-2)", fontSize: 12, maxWidth: 760 }}>
          Schematic representation only — no physical dimensions are implied. {unit.antennas.length - (omni ? 1 : 0)} directional
          antennas across {unit.directions.length} directions, plus one top-mounted omni transmitter. The mapping of antennas to
          layers below is a <strong>configurable default</strong>; see <code className="mono">ENGINEERING VALIDATION REQUIRED</code>{" "}
          notes in SIMULATION_MODEL.md.
        </p>
      </div>

      <div className="panel" style={{ padding: 14, marginBottom: 14 }}>
        <div className="panel-header" style={{ padding: 0, border: 0, marginBottom: 10 }}>
          {omniLayer?.name ?? "Layer 1 — Omni Transmitter"}
        </div>
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "14px 28px",
            border: "1px solid var(--border-bright)",
            borderRadius: 6,
            background: "var(--bg-2)",
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--accent)" }} />
          <span className="mono" style={{ fontSize: 12 }}>{omni?.code ?? "ANT-OMNI"}</span>
          <span style={{ fontSize: 10, color: "var(--text-2)" }}>Top-mounted, unit-wide</span>
        </div>
      </div>

      <div className="panel" style={{ padding: 14 }}>
        <div className="panel-header" style={{ padding: 0, border: 0, marginBottom: 10 }}>
          Directional Antennas (Layers 2–4 × 6 directions)
        </div>
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              {unit.directions.map((d) => (
                <th key={d.id}>{d.code}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {directionalLayers.map((layer) => (
              <tr key={layer.id}>
                <td style={{ color: "var(--text-1)" }}>{layer.name}</td>
                {unit.directions.map((d) => {
                  const antenna = unit.antennas.find((a) => a.directionId === d.id && a.layer?.code === layer.code);
                  return (
                    <td key={d.id} className="mono">
                      {antenna ? (
                        <span style={{ padding: "3px 8px", border: "1px solid var(--border-bright)", borderRadius: 3 }}>
                          {antenna.code}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
