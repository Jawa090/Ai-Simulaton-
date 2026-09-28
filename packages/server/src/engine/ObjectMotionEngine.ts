import { ObjectRuntimeState } from "./types";

/**
 * Pure object-motion simulation. Advances a simulated flying object toward
 * the next waypoint in its trajectory at its configured speed. When the
 * final waypoint is reached the object continues in a straight line on its
 * last heading until externally marked EXITED/REMOVED (e.g. by leaving the
 * configured simulation bounds).
 */
export class ObjectMotionEngine {
  /** Advance `state` in place by `dtMs` simulated milliseconds. */
  static advance(state: ObjectRuntimeState, dtMs: number): ObjectRuntimeState {
    if (state.status !== "ACTIVE") return state;

    const dtSec = dtMs / 1000;
    const distanceThisTick = state.speedUnitsPerSec * dtSec;

    const target = state.waypoints[state.waypointIndex];
    if (!target) {
      // No trajectory left: continue in last known heading.
      const rad = (state.headingDeg * Math.PI) / 180;
      state.x += Math.cos(rad) * distanceThisTick;
      state.y += Math.sin(rad) * distanceThisTick;
      state.t += dtMs;
      return state;
    }

    let remaining = distanceThisTick;
    let cur = { x: state.x, y: state.y, z: state.z };

    while (remaining > 0) {
      const wp = state.waypoints[state.waypointIndex];
      if (!wp) break;
      const dx = wp.x - cur.x;
      const dy = wp.y - cur.y;
      const dz = wp.z - cur.z;
      const legDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (legDistance <= remaining) {
        // Reach this waypoint and continue toward the next with leftover distance.
        cur = { x: wp.x, y: wp.y, z: wp.z };
        remaining -= legDistance;
        if (legDistance > 0) {
          state.headingDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        }
        state.waypointIndex += 1;
        if (state.waypointIndex >= state.waypoints.length) {
          // No further waypoints: spend the leftover distance continuing
          // straight on the last heading within this same tick.
          if (remaining > 0) {
            const rad = (state.headingDeg * Math.PI) / 180;
            cur = { x: cur.x + Math.cos(rad) * remaining, y: cur.y + Math.sin(rad) * remaining, z: cur.z };
          }
          remaining = 0;
          break;
        }
      } else {
        const ratio = legDistance === 0 ? 0 : remaining / legDistance;
        cur = { x: cur.x + dx * ratio, y: cur.y + dy * ratio, z: cur.z + dz * ratio };
        if (legDistance > 0) {
          state.headingDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        }
        remaining = 0;
      }
    }

    state.x = cur.x;
    state.y = cur.y;
    state.z = cur.z;
    state.t += dtMs;
    return state;
  }
}
