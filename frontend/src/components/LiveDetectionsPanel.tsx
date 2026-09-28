import { TrackDto } from "../api/types";
import { StatusBadge } from "./StatusBadge";

export function LiveDetectionsPanel({ tracks, onSelect }: { tracks: TrackDto[]; onSelect?: (track: TrackDto) => void }) {
  const live = tracks.filter((t) => ["DETECTED", "LOCKED", "TRACKING"].includes(t.status));
  return (
    <table>
      <thead>
        <tr>
          <th>Track</th>
          <th>Object</th>
          <th>X / Y / Z</th>
          <th>Dir</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {live.length === 0 && (
          <tr>
            <td colSpan={5} className="notice">
              No active detections.
            </td>
          </tr>
        )}
        {live.map((t) => (
          <tr key={t.id} onClick={() => onSelect?.(t)} style={{ cursor: onSelect ? "pointer" : "default" }}>
            <td className="mono">{t.code}</td>
            <td>{t.object?.label ?? t.object?.type ?? "—"}</td>
            <td className="mono">
              {Math.round(t.currentX)}, {Math.round(t.currentY)}, {Math.round(t.currentZ)}
            </td>
            <td>{t.direction?.code ?? "—"}</td>
            <td>
              <StatusBadge value={t.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
