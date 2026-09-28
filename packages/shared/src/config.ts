import { ObjectType } from "./enums";

/**
 * SIMULATION PARAMETERS — ENGINEERING VALIDATION REQUIRED
 * ---------------------------------------------------------------------------
 * Every numeric value in this file is a placeholder used to make the Phase-1
 * software simulation behave in a plausible, demonstrable way. None of these
 * values have been validated against real antenna, RF, or radar engineering
 * specifications. They must be replaced by the avionics engineering team
 * before any value here is treated as authoritative.
 *
 * All values are also stored in the database (see `simulation_parameters` /
 * `signals` / `object_profiles` tables) so they can be changed at runtime
 * through the configuration API without a code change or redeploy.
 */

/** Conceptual signal band supplied by the project brief. SIMULATION PARAMETER ONLY. */
export const SIGNAL_FREQUENCY_RANGE_HZ = {
  min: 2200, // 2.2 kHz
  max: 2700, // 2.7 kHz
} as const;

export const ANTENNAS_PER_UNIT = 18;
export const DIRECTIONS_PER_UNIT = 6;
export const ANTENNAS_PER_DIRECTION = 3; // 18 / 6 — ENGINEERING VALIDATION REQUIRED

/**
 * Default (placeholder) mapping of the 3 antennas in a direction onto the
 * three directional layers. This is a CONFIGURABLE DEFAULT, not an assumed
 * physical fact — see antennas.layerId in the schema. The top omni
 * transmitter is a separate element (Layer 1) and is not one of the 18.
 * ENGINEERING VALIDATION REQUIRED.
 */
export const DEFAULT_ANTENNA_LAYER_ORDER = [
  "LAYER_2_HIGH_ALTITUDE",
  "LAYER_3_HORIZON",
  "LAYER_4_NEARBY_ALTITUDE",
] as const;

/** Placeholder directional field geometry (conceptual, not-to-scale units). */
export const DEFAULT_FIELD_GEOMETRY = {
  /** azimuth width of a single directional sector, degrees */
  sectorWidthDeg: 60,
  /** simulated radial coverage range, arbitrary simulation units */
  rangeUnits: 400,
  layers: {
    LAYER_2_HIGH_ALTITUDE: { minAltitudeUnits: 250, maxAltitudeUnits: 500 },
    LAYER_3_HORIZON: { minAltitudeUnits: 60, maxAltitudeUnits: 250 },
    LAYER_4_NEARBY_ALTITUDE: { minAltitudeUnits: 0, maxAltitudeUnits: 60 },
  },
} as const;

/**
 * Abstract simulated "propagation" constant used only to derive a plausible
 * simulated echo delay from simulated distance, purely for demonstrating the
 * send/return timing → range-estimation concept. NOT a real RF/propagation
 * speed. ENGINEERING VALIDATION REQUIRED.
 */
export const SIMULATED_PROPAGATION_UNITS_PER_MS = 50;

/** Simulated estimation noise, expressed as +/- simulation units. Demonstrates
 * that estimated XYZ is derived, not a raw ground-truth readout. */
export const SIMULATED_ESTIMATION_NOISE_UNITS = 4;

/** Number of consecutive detections required before a track is LOCKED. */
export const LOCK_AFTER_DETECTION_COUNT = 2;

/** Simulated ticks of absence before a TRACKING track is marked LOST. */
export const LOST_AFTER_MISSED_TICKS = 5;

/** Simulated ticks a LOST track waits before being CLOSED. */
export const CLOSE_AFTER_LOST_TICKS = 10;

export interface ObjectProfileDefaults {
  type: ObjectType;
  label: string;
  minAltitudeUnits: number;
  maxAltitudeUnits: number;
  defaultSpeedUnitsPerSec: number;
  note: string;
}

/**
 * Altitude bands are converted from the project brief's approximate feet
 * ranges into arbitrary simulation altitude units (NOT TO SCALE) using a
 * simple placeholder ratio. ENGINEERING VALIDATION REQUIRED.
 */
export const OBJECT_PROFILE_DEFAULTS: Record<ObjectType, ObjectProfileDefaults> = {
  [ObjectType.WIDE_BODY_AIRCRAFT]: {
    type: ObjectType.WIDE_BODY_AIRCRAFT,
    label: "Wide-body civilian aircraft",
    minAltitudeUnits: 300,
    maxAltitudeUnits: 500,
    defaultSpeedUnitsPerSec: 18,
    note: "Approx. 10,000 ft and above (project brief). SIMULATION PARAMETER.",
  },
  [ObjectType.NARROW_BODY_AIRCRAFT]: {
    type: ObjectType.NARROW_BODY_AIRCRAFT,
    label: "Narrow-body civilian aircraft",
    minAltitudeUnits: 300,
    maxAltitudeUnits: 480,
    defaultSpeedUnitsPerSec: 16,
    note: "Approx. 10,000 ft and above (project brief). SIMULATION PARAMETER.",
  },
  [ObjectType.LOW_RANGE_AIRCRAFT]: {
    type: ObjectType.LOW_RANGE_AIRCRAFT,
    label: "Low-range aircraft",
    minAltitudeUnits: 150,
    maxAltitudeUnits: 300,
    defaultSpeedUnitsPerSec: 12,
    note: "Approx. 5,000-10,000 ft (project brief). SIMULATION PARAMETER.",
  },
  [ObjectType.DRONE]: {
    type: ObjectType.DRONE,
    label: "Drone",
    minAltitudeUnits: 150,
    maxAltitudeUnits: 450,
    defaultSpeedUnitsPerSec: 6,
    note: "Approx. 5,000-15,000 ft (project brief). SIMULATION PARAMETER.",
  },
  [ObjectType.HELICOPTER]: {
    type: ObjectType.HELICOPTER,
    label: "Helicopter",
    minAltitudeUnits: 0,
    maxAltitudeUnits: 210,
    defaultSpeedUnitsPerSec: 8,
    note: "Approx. below 7,000 ft (project brief). SIMULATION PARAMETER.",
  },
  [ObjectType.QUADCOPTER]: {
    type: ObjectType.QUADCOPTER,
    label: "Quadcopter",
    minAltitudeUnits: 0,
    maxAltitudeUnits: 60,
    defaultSpeedUnitsPerSec: 4,
    note: "Approx. 2,000 ft (project brief). SIMULATION PARAMETER.",
  },
  [ObjectType.SMALL_FLYING_OBJECT]: {
    type: ObjectType.SMALL_FLYING_OBJECT,
    label: "Small flying object",
    minAltitudeUnits: 0,
    maxAltitudeUnits: 30,
    defaultSpeedUnitsPerSec: 3,
    note: "Approx. 1,000 ft (project brief). SIMULATION PARAMETER.",
  },
};

export const SIMULATION_SPEED_MULTIPLIERS = [0.5, 1, 2, 5, 10] as const;

/** Fixed-tick length of the simulation loop, in simulated milliseconds. */
export const SIMULATION_TICK_MS = 250;

export const SIMULATION_NOT_TO_SCALE_LABEL = "SIMULATION / NOT TO SCALE";
export const ESTIMATION_DISCLAIMER = "SIMULATED / ESTIMATED / NOT FOR OPERATIONAL USE";
