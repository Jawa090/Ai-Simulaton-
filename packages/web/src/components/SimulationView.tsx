import { useEffect, useMemo, useRef, useState } from "react";
import { TickObject } from "../ws/SimulationSocketContext";

export interface DirectionGeo {
  id: string;
  code: string;
  azimuthCenterDeg: number;
  sectorWidthDeg: number;
  rangeUnits: number;
}

interface Props {
  directions: DirectionGeo[];
  objects: TickObject[];
  selectedObjectId?: string | null;
  onSelectObject?: (id: string) => void;
  maxRangeUnits?: number;
}

const VIEW = 760;
const CENTER = VIEW / 2;
const DIRECTION_COLORS = [
  "#4fc3f7", "#7fd88f", "#e0a83e", "#e0554f", "#b48ce0", "#5ac8c8",
];

function toScreen(x: number, y: number, scale: number) {
  return { sx: CENTER + x * scale, sy: CENTER - y * scale };
}

function wedgePath(azimuthCenterDeg: number, sectorWidthDeg: number, radiusPx: number) {
  const half = sectorWidthDeg / 2;
  const startDeg = azimuthCenterDeg - half;
  const endDeg = azimuthCenterDeg + half;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const p1 = { x: CENTER + radiusPx * Math.cos(toRad(startDeg)), y: CENTER - radiusPx * Math.sin(toRad(startDeg)) };
  const p2 = { x: CENTER + radiusPx * Math.cos(toRad(endDeg)), y: CENTER - radiusPx * Math.sin(toRad(endDeg)) };
  const largeArc = sectorWidthDeg > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${radiusPx} ${radiusPx} 0 ${largeArc} 0 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} Z`;
}

export function SimulationView({ directions, objects, selectedObjectId, onSelectObject, maxRangeUnits = 400 }: Props) {
  const scale = (VIEW * 0.44) / maxRangeUnits;
  const trailsRef = useRef<Map<string, { x: number; y: number }[]>>(new Map());
  const [, forceTick] = useState(0);

  useEffect(() => {
    for (const obj of objects) {
      const trail = trailsRef.current.get(obj.id) ?? [];
      trail.push({ x: obj.x, y: obj.y });
      if (trail.length > 60) trail.shift();
      trailsRef.current.set(obj.id, trail);
    }
    forceTick((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects]);

  const rangePx = useMemo(() => directions.map((d) => d.rangeUnits * scale), [directions, scale]);

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} width="100%" height="100%" style={{ background: "radial-gradient(circle, #0d1319 0%, #080b0e 100%)" }}>
      {/* range rings */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle key={f} cx={CENTER} cy={CENTER} r={VIEW * 0.44 * f} fill="none" stroke="#1c2530" strokeWidth={1} />
      ))}

      {/* directional sectors */}
      {directions.map((d, i) => (
        <g key={d.id}>
          <path
            d={wedgePath(d.azimuthCenterDeg, d.sectorWidthDeg, rangePx[i])}
            fill={DIRECTION_COLORS[i % DIRECTION_COLORS.length]}
            fillOpacity={0.07}
            stroke={DIRECTION_COLORS[i % DIRECTION_COLORS.length]}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
          {(() => {
            const rad = (d.azimuthCenterDeg * Math.PI) / 180;
            const lx = CENTER + (rangePx[i] + 14) * Math.cos(rad);
            const ly = CENTER - (rangePx[i] + 14) * Math.sin(rad);
            return (
              <text x={lx} y={ly} fill={DIRECTION_COLORS[i % DIRECTION_COLORS.length]} fontSize={11} textAnchor="middle" fontFamily="var(--mono)">
                {d.code}
              </text>
            );
          })()}
        </g>
      ))}

      {/* unit + omni transmitter */}
      <circle cx={CENTER} cy={CENTER} r={9} fill="#e6edf3" />
      <circle cx={CENTER} cy={CENTER} r={14} fill="none" stroke="#e6edf3" strokeWidth={1} strokeDasharray="2 2" />
      <text x={CENTER} y={CENTER + 28} textAnchor="middle" fill="var(--text-1)" fontSize={11} fontFamily="var(--mono)">
        UNIT-01
      </text>

      {/* trails */}
      {objects.map((obj) => {
        const trail = trailsRef.current.get(obj.id) ?? [];
        if (trail.length < 2) return null;
        const points = trail.map((p) => {
          const { sx, sy } = toScreen(p.x, p.y, scale);
          return `${sx.toFixed(1)},${sy.toFixed(1)}`;
        });
        return (
          <polyline
            key={`trail-${obj.id}`}
            points={points.join(" ")}
            fill="none"
            stroke="#4fc3f7"
            strokeOpacity={0.4}
            strokeWidth={1.5}
          />
        );
      })}

      {/* objects */}
      {objects.map((obj) => {
        const { sx, sy } = toScreen(obj.x, obj.y, scale);
        const selected = obj.id === selectedObjectId;
        return (
          <g key={obj.id} onClick={() => onSelectObject?.(obj.id)} style={{ cursor: "pointer" }}>
            {selected && <circle cx={sx} cy={sy} r={12} fill="none" stroke="#ff4d4d" strokeWidth={1.5} />}
            <circle cx={sx} cy={sy} r={5} fill="#ffb648" stroke="#0a0e12" strokeWidth={1} />
            <text x={sx + 9} y={sy - 8} fill="var(--text-0)" fontSize={10} fontFamily="var(--mono)">
              {obj.label} · Z{Math.round(obj.z)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
