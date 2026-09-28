import { SimulationEventType } from "./enums";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PositionSample extends Vector3 {
  /** simulated time, ms since simulation session start */
  t: number;
}

/** Generic envelope broadcast over the WebSocket / stored in system_events. */
export interface SimulationEventPayload<T = unknown> {
  eventId: string;
  eventType: SimulationEventType;
  timestamp: string; // ISO-8601
  simulationSessionId: string | null;
  unitId?: string | null;
  signalId?: string | null;
  trackId?: string | null;
  objectId?: string | null;
  directionId?: string | null;
  antennaId?: string | null;
  alertId?: string | null;
  message: string;
  payload: T;
}

export interface LiveDetectionRow {
  trackId: string;
  objectType: string;
  x: number;
  y: number;
  z: number;
  altitudeUnits: number;
  speedUnitsPerSec: number;
  direction: string;
  status: string;
}

export const WS_HELLO = "hello";
export const WS_EVENT = "event";
