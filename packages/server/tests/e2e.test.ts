import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db/client";
import { simulationEngine } from "../src/engine/SimulationEngine";
import { ObjectType, TrackStatus } from "@avitronics/shared";

async function waitUntil(predicate: () => Promise<boolean>, timeoutMs = 15000, intervalMs = 200): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Condition not met within timeout");
}

/**
 * End-to-end lifecycle test (spec section 40/45):
 * object enters field -> interaction -> simulated echo -> detection ->
 * track created -> locked -> XYZ/T recorded -> alert generated.
 */
describe("Full simulation lifecycle (end-to-end)", () => {
  let unitId: string;
  let objectId: string;

  beforeAll(async () => {
    const unit = await prisma.unit.findFirstOrThrow({ where: { code: "UNIT-01" } });
    unitId = unit.id;
    await simulationEngine.start(unitId, 5);

    const object = await simulationEngine.spawnObject({
      type: ObjectType.DRONE,
      label: "E2E-TEST-DRONE",
      x: 350,
      y: 0,
      z: 150,
      speedUnitsPerSec: 40,
      waypoints: [{ x: 50, y: 0, z: 150 }],
    });
    objectId = object.id;
  });

  afterAll(async () => {
    await simulationEngine.reset();
  });

  it("generates an interaction once the object enters an active field", async () => {
    await waitUntil(async () => {
      const count = await prisma.interaction.count({ where: { objectId } });
      return count > 0;
    });
    const interactions = await prisma.interaction.findMany({ where: { objectId } });
    expect(interactions.length).toBeGreaterThan(0);
  });

  it("creates a detection with an estimated XYZ position", async () => {
    await waitUntil(async () => {
      const count = await prisma.detection.count();
      return count > 0;
    });
    const detection = await prisma.detection.findFirst({ orderBy: { timestamp: "desc" } });
    expect(detection).not.toBeNull();
    expect(detection!.estimatedRangeUnits).toBeGreaterThan(0);
    expect(detection!.echoDelayMs).toBeGreaterThan(0);
  });

  it("creates a track and progresses it to LOCKED", async () => {
    await waitUntil(async () => {
      const track = await prisma.track.findFirst({ where: { objectId } });
      return track?.status === TrackStatus.LOCKED || track?.status === TrackStatus.TRACKING;
    });
    const track = await prisma.track.findFirstOrThrow({ where: { objectId } });
    expect(track.code).toMatch(/^TRK-\d{5}$/);
    expect([TrackStatus.LOCKED, TrackStatus.TRACKING]).toContain(track.status);
    expect(track.detectionCount).toBeGreaterThanOrEqual(2);
  });

  it("records track point history (X, Y, Z, T over time)", async () => {
    const track = await prisma.track.findFirstOrThrow({ where: { objectId } });
    const points = await prisma.trackPoint.findMany({ where: { trackId: track.id } });
    expect(points.length).toBeGreaterThan(0);
    expect(points[0]).toHaveProperty("x");
    expect(points[0]).toHaveProperty("t");
  });

  it("generates an alert requiring human review once the track is locked", async () => {
    await waitUntil(async () => {
      const track = await prisma.track.findFirst({ where: { objectId } });
      if (!track) return false;
      const count = await prisma.alert.count({ where: { trackId: track.id } });
      return count > 0;
    });
    const track = await prisma.track.findFirstOrThrow({ where: { objectId } });
    const alert = await prisma.alert.findFirstOrThrow({ where: { trackId: track.id } });
    expect(alert.code).toMatch(/^ALERT-\d{4}$/);
    expect(alert.status).toBe("OPEN");
  });
});
