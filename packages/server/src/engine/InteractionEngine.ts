import { FieldVolume, ObjectRuntimeState } from "./types";

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

function azimuthWithinSector(azimuthDeg: number, startDeg: number, endDeg: number): boolean {
  const a = normalizeDeg(azimuthDeg);
  const s = normalizeDeg(startDeg);
  const e = normalizeDeg(endDeg);
  if (s <= e) return a >= s && a <= e;
  return a >= s || a <= e; // sector wraps past 360/0
}

/**
 * Determines whether a simulated object currently intersects any active
 * simulated field volume. This models "signal interaction" purely as a
 * geometric containment test against the field volumes computed by
 * FieldEngine — there is no simulated RF propagation.
 */
export class InteractionEngine {
  static findIntersections(object: ObjectRuntimeState, fields: FieldVolume[]): FieldVolume[] {
    const r = Math.sqrt(object.x * object.x + object.y * object.y);
    const azimuthDeg = (Math.atan2(object.y, object.x) * 180) / Math.PI;

    return fields.filter((f) => {
      if (r > f.rangeUnits) return false;
      if (object.z < f.altMinUnits || object.z > f.altMaxUnits) return false;
      return azimuthWithinSector(azimuthDeg, f.azimuthStartDeg, f.azimuthEndDeg);
    });
  }
}
