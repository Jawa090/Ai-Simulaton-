import { describe, expect, it } from "vitest";
import { ObjectMotionEngine } from "../src/engine/ObjectMotionEngine";
import { FieldEngine } from "../src/engine/FieldEngine";
import { InteractionEngine } from "../src/engine/InteractionEngine";
import { EstimationEngine } from "../src/engine/EstimationEngine";
import { AlertEngine } from "../src/engine/AlertEngine";
import { ObjectRuntimeState } from "../src/engine/types";
import { UnitRuntimeContext } from "../src/engine/SimulationContext";
import { AlertSeverity, SignalStatus } from "@avitronics/shared";

function makeObject(overrides: Partial<ObjectRuntimeState> = {}): ObjectRuntimeState {
  return {
    id: "obj-1",
    type: "DRONE",
    label: "Test Drone",
    x: 0,
    y: 0,
    z: 100,
    t: 0,
    headingDeg: 0,
    speedUnitsPerSec: 10,
    waypoints: [],
    waypointIndex: 0,
    status: "ACTIVE",
    ...overrides,
  };
}

describe("ObjectMotionEngine", () => {
  it("moves an object toward its next waypoint at the configured speed", () => {
    const obj = makeObject({ x: 0, y: 0, z: 0, waypoints: [{ x: 100, y: 0, z: 0 }], speedUnitsPerSec: 10 });
    ObjectMotionEngine.advance(obj, 1000); // 1 simulated second -> 10 units
    expect(obj.x).toBeCloseTo(10);
    expect(obj.y).toBeCloseTo(0);
  });

  it("continues past the final waypoint on the last heading", () => {
    const obj = makeObject({ x: 0, y: 0, z: 0, waypoints: [{ x: 10, y: 0, z: 0 }], speedUnitsPerSec: 10 });
    ObjectMotionEngine.advance(obj, 2000); // reaches waypoint (1s) then continues 1s further
    expect(obj.x).toBeCloseTo(20);
    expect(obj.waypointIndex).toBe(1);
  });

  it("does not move an inactive object", () => {
    const obj = makeObject({ status: "EXITED", waypoints: [{ x: 100, y: 0, z: 0 }] });
    ObjectMotionEngine.advance(obj, 1000);
    expect(obj.x).toBe(0);
  });
});

function makeContext(overrides: Partial<UnitRuntimeContext> = {}): UnitRuntimeContext {
  return {
    unitId: "unit-1",
    unitCode: "UNIT-01",
    directions: [{ id: "dir-1", code: "DIR-01", azimuthCenterDeg: 0, sectorWidthDeg: 60, rangeUnits: 400 }],
    antennas: [{ id: "ant-1", code: "ANT-01", directionId: "dir-1", layerId: "layer-3", layerCode: "LAYER_3_HORIZON", isOmni: false }],
    signals: [
      {
        id: "sig-1",
        unitId: "unit-1",
        directionId: "dir-1",
        antennaId: "ant-1",
        layerId: "layer-3",
        frequencyHz: 2450,
        status: SignalStatus.FIELD_ACTIVE,
        enabled: true,
      },
    ],
    geometry: {
      sectorWidthDeg: 60,
      rangeUnits: 400,
      layers: { LAYER_3_HORIZON: { minAltitudeUnits: 60, maxAltitudeUnits: 250 } },
    },
    ...overrides,
  };
}

describe("FieldEngine", () => {
  it("builds an active field volume only for enabled, non-idle signals with a direction", () => {
    const ctx = makeContext();
    const fields = FieldEngine.buildActiveFields(ctx);
    expect(fields).toHaveLength(1);
    expect(fields[0].directionCode).toBe("DIR-01");
    expect(fields[0].azimuthStartDeg).toBeCloseTo(330);
    expect(fields[0].azimuthEndDeg).toBeCloseTo(30);
  });

  it("excludes disabled signals", () => {
    const ctx = makeContext();
    ctx.signals[0].enabled = false;
    expect(FieldEngine.buildActiveFields(ctx)).toHaveLength(0);
  });

  it("excludes idle signals", () => {
    const ctx = makeContext();
    ctx.signals[0].status = SignalStatus.IDLE;
    expect(FieldEngine.buildActiveFields(ctx)).toHaveLength(0);
  });
});

describe("InteractionEngine", () => {
  it("detects an object inside the field's azimuth, range and altitude band", () => {
    const ctx = makeContext();
    const fields = FieldEngine.buildActiveFields(ctx);
    const obj = makeObject({ x: 100, y: 0, z: 150 });
    expect(InteractionEngine.findIntersections(obj, fields)).toHaveLength(1);
  });

  it("excludes an object outside the configured range", () => {
    const ctx = makeContext();
    const fields = FieldEngine.buildActiveFields(ctx);
    const obj = makeObject({ x: 900, y: 0, z: 150 });
    expect(InteractionEngine.findIntersections(obj, fields)).toHaveLength(0);
  });

  it("excludes an object outside the layer's altitude band", () => {
    const ctx = makeContext();
    const fields = FieldEngine.buildActiveFields(ctx);
    const obj = makeObject({ x: 100, y: 0, z: 5 });
    expect(InteractionEngine.findIntersections(obj, fields)).toHaveLength(0);
  });

  it("excludes an object outside the direction's azimuth sector", () => {
    const ctx = makeContext();
    const fields = FieldEngine.buildActiveFields(ctx);
    const obj = makeObject({ x: 0, y: 100, z: 150 }); // azimuth ~90deg, sector is [-30,30]
    expect(InteractionEngine.findIntersections(obj, fields)).toHaveLength(0);
  });
});

describe("EstimationEngine", () => {
  it("derives a positive echo delay proportional to distance (SIMULATED)", () => {
    const near = EstimationEngine.estimate(0, 0, 0, 50, 0, 0, 1);
    const far = EstimationEngine.estimate(0, 0, 0, 500, 0, 0, 1);
    expect(near.echoDelayMs).toBeGreaterThan(0);
    expect(far.echoDelayMs).toBeGreaterThan(near.echoDelayMs);
  });

  it("is deterministic for a given seed", () => {
    const a = EstimationEngine.estimate(0, 0, 0, 100, 20, 150, 42);
    const b = EstimationEngine.estimate(0, 0, 0, 100, 20, 150, 42);
    expect(a).toEqual(b);
  });
});

describe("AlertEngine", () => {
  it("classifies small/uncrewed object types as HIGH severity", () => {
    expect(AlertEngine.classify("DRONE").severity).toBe(AlertSeverity.HIGH);
  });

  it("classifies larger aircraft types as MEDIUM severity", () => {
    expect(AlertEngine.classify("WIDE_BODY_AIRCRAFT").severity).toBe(AlertSeverity.MEDIUM);
  });
});
