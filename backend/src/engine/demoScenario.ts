import { ObjectType } from "@avitronics/shared";
import { prisma } from "../db/client";
import { simulationEngine } from "./SimulationEngine";
import { eventBus } from "../events/EventBus";
import { SimulationEventType } from "@avitronics/shared";

/**
 * DEMO MODE (spec section 35 / 36): a scripted, fully-automated run of the
 * complete simulation lifecycle for presentation purposes. It reuses the
 * same engine/API paths a real operator would use — nothing here is a
 * special-cased shortcut.
 */
export async function runDemoScenario(): Promise<{ unitId: string; objectId: string }> {
  const unit = await prisma.unit.findFirst({ where: { code: "UNIT-01" } });
  if (!unit) {
    throw new Error("UNIT-01 not found. Run the database seed first (npm run db:seed).");
  }

  const state = simulationEngine.getState();
  if (state.state !== "RUNNING") {
    await simulationEngine.start(unit.id, 1);
  }

  await eventBus.publish({
    eventType: SimulationEventType.SimulationStarted,
    message: "DEMO MODE: scripted scenario initiated",
    simulationSessionId: state.simulationSessionId,
    unitId: unit.id,
  });

  // Straight-line pass through DIR-01's sector (centered on 0deg azimuth) at
  // an altitude inside the horizon layer band, entering from outside the
  // configured range and exiting the far side.
  const object = await simulationEngine.spawnObject({
    type: ObjectType.DRONE,
    label: "DEMO-DRONE-01",
    x: 600,
    y: 0,
    z: 150,
    headingDeg: 180,
    speedUnitsPerSec: 60,
    waypoints: [{ x: -600, y: 0, z: 150 }],
  });

  return { unitId: unit.id, objectId: object.id };
}
