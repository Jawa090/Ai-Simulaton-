import { Router } from "express";
import { z } from "zod";
import {
  OBJECT_PROFILE_DEFAULTS,
  SIGNAL_FREQUENCY_RANGE_HZ,
  SimulationEventType,
  UserRole,
} from "@avitronics/shared";
import { prisma } from "../db/client";
import { requireAuth, requireRole } from "../auth/middleware";
import { asyncHandler } from "../middleware/errorHandler";
import { eventBus } from "../events/EventBus";
import { simulationEngine } from "../engine/SimulationEngine";

export const configRouter = Router();

configRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const objectProfiles = await prisma.objectProfile.findMany();
    const geometryParam = await prisma.simulationParameter.findUnique({ where: { key: "field_geometry" } });
    res.json({
      signalFrequencyRangeHz: SIGNAL_FREQUENCY_RANGE_HZ,
      objectProfiles: objectProfiles.length ? objectProfiles : Object.values(OBJECT_PROFILE_DEFAULTS),
      fieldGeometry: geometryParam ? JSON.parse(geometryParam.value) : null,
      note: "All values are SIMULATION PARAMETERS. ENGINEERING VALIDATION REQUIRED before operational use.",
    });
  })
);

const paramSchema = z.object({
  value: z.unknown(),
});

configRouter.patch(
  "/parameters/:key",
  requireAuth,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const { value } = paramSchema.parse(req.body);
    const existing = await prisma.simulationParameter.findUnique({ where: { key: req.params.key } });

    const updated = await prisma.simulationParameter.upsert({
      where: { key: req.params.key },
      update: { value: JSON.stringify(value) },
      create: { key: req.params.key, value: JSON.stringify(value), description: "Operator-configured simulation parameter" },
    });

    await prisma.configurationChange.create({
      data: {
        userId: req.user!.sub,
        userLabel: req.user!.displayName,
        action: "SIMULATION_PARAMETER_CHANGED",
        entityType: "SimulationParameter",
        entityId: updated.key,
        oldValue: existing?.value ?? null,
        newValue: updated.value,
      },
    });

    await eventBus.publish({
      eventType: SimulationEventType.ConfigurationChanged,
      message: `USER: ${req.user!.displayName} | ACTION: Simulation parameter '${req.params.key}' changed`,
    });

    await simulationEngine.reloadContext();

    res.json(updated);
  })
);
