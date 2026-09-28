import { SimEvent } from "../ws/SimulationSocketContext";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

export function EventStream({ events, limit = 60 }: { events: SimEvent[]; limit?: number }) {
  const rows = events.slice(0, limit);
  return (
    <div className="scroll-thin mono" style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11.5 }}>
      {rows.length === 0 && <div className="notice">No simulation events yet. Start the simulation to begin the event stream.</div>}
      {rows.map((e) => (
        <div key={e.eventId} style={{ display: "flex", gap: 8, padding: "2px 0", borderBottom: "1px solid #161d25" }}>
          <span style={{ color: "var(--text-2)" }}>{formatTime(e.timestamp)}</span>
          <span style={{ color: "var(--accent)", minWidth: 170 }}>{e.eventType}</span>
          <span style={{ color: "var(--text-0)" }}>{e.message}</span>
        </div>
      ))}
    </div>
  );
}
