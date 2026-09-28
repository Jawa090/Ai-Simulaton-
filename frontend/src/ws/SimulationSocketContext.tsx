import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { webSocketUrl } from "../config";

export interface SimEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  simulationSessionId: string | null;
  unitId?: string | null;
  signalId?: string | null;
  trackId?: string | null;
  objectId?: string | null;
  directionId?: string | null;
  antennaId?: string | null;
  alertId?: string | null;
  message: string;
  payload: unknown;
}

export interface TickObject {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  z: number;
  t: number;
  headingDeg: number;
  speedUnitsPerSec: number;
  status: string;
}

export interface TickData {
  simulatedTimeMs: number;
  objects: TickObject[];
}

interface SocketValue {
  connected: boolean;
  events: SimEvent[];
  latestTick: TickData | null;
}

const SimulationSocketContext = createContext<SocketValue>({ connected: false, events: [], latestTick: null });

const MAX_EVENTS = 300;

export function SimulationSocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [latestTick, setLatestTick] = useState<TickData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(webSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        retryTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          if (parsed.type === "event") {
            setEvents((prev) => [parsed.data as SimEvent, ...prev].slice(0, MAX_EVENTS));
          } else if (parsed.type === "tick") {
            setLatestTick(parsed.data as TickData);
          }
        } catch {
          // ignore malformed frames
        }
      };
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, []);

  return (
    <SimulationSocketContext.Provider value={{ connected, events, latestTick }}>
      {children}
    </SimulationSocketContext.Provider>
  );
}

export function useSimulationSocket() {
  return useContext(SimulationSocketContext);
}
