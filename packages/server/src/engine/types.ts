export interface Waypoint {
  x: number;
  y: number;
  z: number;
}

export interface ObjectRuntimeState {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  z: number;
  t: number; // simulated ms since session start
  headingDeg: number;
  speedUnitsPerSec: number;
  waypoints: Waypoint[];
  waypointIndex: number;
  status: "ACTIVE" | "EXITED" | "REMOVED";
}

export interface FieldVolume {
  unitId: string;
  directionId: string;
  directionCode: string;
  antennaId: string;
  antennaCode: string;
  layerId: string;
  layerCode: string;
  signalId: string;
  frequencyHz: number;
  azimuthStartDeg: number;
  azimuthEndDeg: number;
  rangeUnits: number;
  altMinUnits: number;
  altMaxUnits: number;
}

export interface PendingEcho {
  interactionId: string;
  unitId: string;
  directionId: string;
  antennaId: string;
  signalId: string;
  objectId: string;
  originX: number;
  originY: number;
  originZ: number;
  originT: number;
  distanceUnits: number;
  scheduledAtT: number; // simulated ms at which echo should be processed
}

export interface TrackRuntimeState {
  id: string;
  code: string;
  objectId: string;
  unitId: string;
  directionId: string | null;
  antennaId: string | null;
  status: string;
  detectionCount: number;
  missedTicks: number;
  lostTicks: number;
  lastActiveKey: string | null; // `${directionId}:${antennaId}` of last interaction
}
