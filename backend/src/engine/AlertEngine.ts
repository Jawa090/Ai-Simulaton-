import { AlertSeverity } from "@avitronics/shared";

const HIGH_SEVERITY_TYPES = new Set(["DRONE", "QUADCOPTER", "SMALL_FLYING_OBJECT"]);

/**
 * Decides alert severity/reason when a track transitions to LOCKED.
 * Phase-1 rule: every locked track is unidentified by default (there is no
 * IFF/whitelist integration yet) and therefore always requires human review.
 * Severity is a simple heuristic based on object category, not a validated
 * threat assessment.
 */
export class AlertEngine {
  static classify(objectType: string): { severity: AlertSeverity; reason: string } {
    if (HIGH_SEVERITY_TYPES.has(objectType)) {
      return {
        severity: AlertSeverity.HIGH,
        reason: `Unidentified ${objectType.replace(/_/g, " ").toLowerCase()} locked by simulated tracking. Requires human review.`,
      };
    }
    return {
      severity: AlertSeverity.MEDIUM,
      reason: `Unidentified object (${objectType.replace(/_/g, " ").toLowerCase()}) locked by simulated tracking. Requires human review.`,
    };
  }
}
