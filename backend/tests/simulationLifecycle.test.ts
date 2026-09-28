import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db/client";
import { simulationEngine } from "../src/engine/SimulationEngine";
import { SimulationState } from "@avitronics/shared";

describe("Simulation lifecycle control", () => {
  afterAll(async () => {
    await simulationEngine.reset();
  });

  it("starts, pauses, resumes and resets a simulation session", async () => {
    const unit = await prisma.unit.findFirstOrThrow({ where: { code: "UNIT-01" } });

    await simulationEngine.start(unit.id, 1);
    expect(simulationEngine.getState().state).toBe(SimulationState.RUNNING);
    expect(simulationEngine.getState().simulationSessionCode).toMatch(/^SIM-\d{4}-\d{3}$/);

    await simulationEngine.pause();
    expect(simulationEngine.getState().state).toBe(SimulationState.PAUSED);

    await simulationEngine.resume();
    expect(simulationEngine.getState().state).toBe(SimulationState.RUNNING);

    await simulationEngine.reset();
    expect(simulationEngine.getState().state).toBe(SimulationState.STOPPED);
  });

  it("activates all enabled unit signals to FIELD_ACTIVE on start", async () => {
    const unit = await prisma.unit.findFirstOrThrow({ where: { code: "UNIT-01" } });
    await simulationEngine.start(unit.id, 1);

    const signals = await prisma.signal.findMany({ where: { unitId: unit.id, enabled: true } });
    expect(signals.length).toBeGreaterThan(0);
    for (const s of signals) {
      expect(s.status).toBe("FIELD_ACTIVE");
    }
  });
});

describe("Configuration validation", () => {
  it("stores a configuration change record when a signal frequency is edited directly", async () => {
    const signal = await prisma.signal.findFirstOrThrow();
    const before = signal.frequencyHz;
    const newFreq = before === 2400 ? 2450 : 2400;

    await prisma.signal.update({ where: { id: signal.id }, data: { frequencyHz: newFreq } });
    await prisma.configurationChange.create({
      data: {
        userLabel: "Operator-01",
        action: "SIGNAL_UPDATED",
        entityType: "Signal",
        entityId: signal.id,
        oldValue: String(before),
        newValue: String(newFreq),
      },
    });

    const changes = await prisma.configurationChange.findMany({ where: { entityId: signal.id } });
    expect(changes.length).toBeGreaterThan(0);
  });
});
