import { UnitRuntimeContext } from "./SimulationContext";
import { FieldVolume } from "./types";
import { SignalStatus } from "@avitronics/shared";

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Builds the set of currently-active simulated monitoring field volumes for
 * a unit from its directions/antennas/layers/signals configuration. A field
 * volume is a conceptual 3D wedge: an azimuth sector (direction), bounded by
 * a radial range, restricted to an altitude band (layer). It is entirely a
 * software construct — no RF field is generated.
 */
export class FieldEngine {
  static buildActiveFields(ctx: UnitRuntimeContext): FieldVolume[] {
    const directionsById = new Map(ctx.directions.map((d) => [d.id, d]));
    const antennasById = new Map(ctx.antennas.map((a) => [a.id, a]));
    const fields: FieldVolume[] = [];

    for (const signal of ctx.signals) {
      if (!signal.enabled) continue;
      if (signal.status === SignalStatus.DISABLED || signal.status === SignalStatus.IDLE) continue;

      const antenna = antennasById.get(signal.antennaId);
      if (!antenna || antenna.isOmni) continue; // the omni transmitter does not define a directional field
      const direction = antenna.directionId ? directionsById.get(antenna.directionId) : undefined;
      if (!direction) continue;

      const altBand = ctx.geometry.layers[antenna.layerCode];
      if (!altBand) continue;

      const half = direction.sectorWidthDeg / 2;
      fields.push({
        unitId: ctx.unitId,
        directionId: direction.id,
        directionCode: direction.code,
        antennaId: antenna.id,
        antennaCode: antenna.code,
        layerId: antenna.layerId,
        layerCode: antenna.layerCode,
        signalId: signal.id,
        frequencyHz: signal.frequencyHz,
        azimuthStartDeg: normalizeDeg(direction.azimuthCenterDeg - half),
        azimuthEndDeg: normalizeDeg(direction.azimuthCenterDeg + half),
        rangeUnits: direction.rangeUnits,
        altMinUnits: altBand.minAltitudeUnits,
        altMaxUnits: altBand.maxAltitudeUnits,
      });
    }

    return fields;
  }
}
