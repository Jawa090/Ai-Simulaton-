export interface UnitSummary {
  id: string;
  code: string;
  name: string;
  status: string;
  antennaCount: number;
  activeSignals: number;
  activeTracks: number;
  openAlerts: number;
}

export interface DirectionDto {
  id: string;
  code: string;
  azimuthCenterDeg: number;
  sectorWidthDeg: number;
  rangeUnits: number;
  unitId: string;
  antennas?: AntennaDto[];
  signals?: SignalDto[];
  interactionCount?: number;
  detectionCount?: number;
}

export interface AntennaDto {
  id: string;
  code: string;
  unitId: string;
  directionId: string | null;
  layerId: string;
  isOmni: boolean;
  layer?: { code: string; name: string; sortOrder: number };
  direction?: { code: string } | null;
}

export interface SignalDto {
  id: string;
  unitId: string;
  directionId: string | null;
  antennaId: string;
  layerId: string;
  frequencyHz: number;
  status: string;
  enabled: boolean;
  antenna?: AntennaDto;
  direction?: { code: string } | null;
  layer?: { code: string; name: string };
}

export interface TrackDto {
  id: string;
  code: string;
  objectId: string;
  unitId: string;
  directionId: string | null;
  antennaId: string | null;
  status: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  currentX: number;
  currentY: number;
  currentZ: number;
  currentT: number;
  estimatedSpeed: number;
  estimatedDirectionDeg: number;
  detectionCount: number;
  object?: { type: string; label: string };
  direction?: { code: string } | null;
}

export interface AlertDto {
  id: string;
  code: string;
  trackId: string;
  objectType: string;
  unitId: string;
  directionId: string | null;
  x: number;
  y: number;
  z: number;
  t: number;
  severity: string;
  reason: string;
  status: string;
  createdAt: string;
  track?: { code: string };
  direction?: { code: string } | null;
}

export interface SimulationStateDto {
  state: "STOPPED" | "RUNNING" | "PAUSED";
  simulationSessionId: string | null;
  simulationSessionCode: string | null;
  speedMultiplier: number;
  simulatedTimeMs: number;
  unitId: string | null;
  activeObjectCount: number;
}

export interface UnitDetailDto extends UnitSummary {
  directions: DirectionDto[];
  antennas: AntennaDto[];
  signals: SignalDto[];
  activeTracks: number;
}
