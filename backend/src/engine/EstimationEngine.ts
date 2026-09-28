import {
  SIMULATED_PROPAGATION_UNITS_PER_MS,
  SIMULATED_ESTIMATION_NOISE_UNITS,
} from "@avitronics/shared";

export interface EstimationResult {
  distanceUnits: number;
  echoDelayMs: number;
  estimatedX: number;
  estimatedY: number;
  estimatedZ: number;
}

/**
 * SIMULATED / ESTIMATED / NOT FOR OPERATIONAL USE.
 *
 * Demonstrates the send/return timing -> range concept described in the
 * project brief using an abstract, clearly-labeled simulation constant
 * (SIMULATED_PROPAGATION_UNITS_PER_MS). The "estimated" position is the
 * object's true simulated position perturbed by a small deterministic
 * pseudo-random offset, so the UI can show that XYZ is *derived* rather
 * than a raw ground-truth readout. This calculation model is intentionally
 * isolated behind this class so it can be swapped for a validated model
 * later without touching the rest of the pipeline.
 */
export class EstimationEngine {
  static estimate(
    unitX: number,
    unitY: number,
    unitZ: number,
    objectX: number,
    objectY: number,
    objectZ: number,
    seed: number
  ): EstimationResult {
    const dx = objectX - unitX;
    const dy = objectY - unitY;
    const dz = objectZ - unitZ;
    const distanceUnits = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const echoDelayMs = (2 * distanceUnits) / SIMULATED_PROPAGATION_UNITS_PER_MS;

    const noise = pseudoRandomNoise(seed);
    return {
      distanceUnits,
      echoDelayMs,
      estimatedX: objectX + noise.nx * SIMULATED_ESTIMATION_NOISE_UNITS,
      estimatedY: objectY + noise.ny * SIMULATED_ESTIMATION_NOISE_UNITS,
      estimatedZ: objectZ + noise.nz * SIMULATED_ESTIMATION_NOISE_UNITS,
    };
  }
}

/** Deterministic pseudo-random unit-ish offsets derived from a seed, so
 * estimation results are reproducible across test runs. */
function pseudoRandomNoise(seed: number): { nx: number; ny: number; nz: number } {
  const a = Math.sin(seed * 12.9898) * 43758.5453;
  const b = Math.sin(seed * 78.233) * 12345.6789;
  const c = Math.sin(seed * 37.719) * 98765.4321;
  return {
    nx: (a - Math.floor(a)) * 2 - 1,
    ny: (b - Math.floor(b)) * 2 - 1,
    nz: (c - Math.floor(c)) * 2 - 1,
  };
}
