import { prisma } from "../db/client";
import { DEFAULT_FIELD_GEOMETRY } from "@avitronics/shared";

export interface DirectionRuntime {
  id: string;
  code: string;
  azimuthCenterDeg: number;
  sectorWidthDeg: number;
  rangeUnits: number;
}

export interface AntennaRuntime {
  id: string;
  code: string;
  directionId: string | null;
  layerId: string;
  layerCode: string;
  isOmni: boolean;
}

export interface SignalRuntime {
  id: string;
  unitId: string;
  directionId: string | null;
  antennaId: string;
  layerId: string;
  frequencyHz: number;
  status: string;
  enabled: boolean;
}

export interface FieldGeometryConfig {
  sectorWidthDeg: number;
  rangeUnits: number;
  layers: Record<string, { minAltitudeUnits: number; maxAltitudeUnits: number }>;
}

export interface UnitRuntimeContext {
  unitId: string;
  unitCode: string;
  directions: DirectionRuntime[];
  antennas: AntennaRuntime[];
  signals: SignalRuntime[];
  geometry: FieldGeometryConfig;
}

/** Loads the current configuration for a unit from the database into a
 * flat, engine-friendly runtime structure. Called at simulation start and
 * whenever configuration changes need to take effect. */
export async function loadUnitContext(unitId: string): Promise<UnitRuntimeContext> {
  const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId } });
  const directions = await prisma.direction.findMany({ where: { unitId } });
  const antennas = await prisma.antenna.findMany({ where: { unitId }, include: { layer: true } });
  const signals = await prisma.signal.findMany({ where: { unitId } });

  const geometryParam = await prisma.simulationParameter.findUnique({ where: { key: "field_geometry" } });
  const geometry: FieldGeometryConfig = geometryParam
    ? JSON.parse(geometryParam.value)
    : (DEFAULT_FIELD_GEOMETRY as unknown as FieldGeometryConfig);

  return {
    unitId: unit.id,
    unitCode: unit.code,
    directions: directions.map((d) => ({
      id: d.id,
      code: d.code,
      azimuthCenterDeg: d.azimuthCenterDeg,
      sectorWidthDeg: d.sectorWidthDeg,
      rangeUnits: d.rangeUnits,
    })),
    antennas: antennas.map((a) => ({
      id: a.id,
      code: a.code,
      directionId: a.directionId,
      layerId: a.layerId,
      layerCode: a.layer.code,
      isOmni: a.isOmni,
    })),
    signals: signals.map((s) => ({
      id: s.id,
      unitId: s.unitId,
      directionId: s.directionId,
      antennaId: s.antennaId,
      layerId: s.layerId,
      frequencyHz: s.frequencyHz,
      status: s.status,
      enabled: s.enabled,
    })),
    geometry,
  };
}
