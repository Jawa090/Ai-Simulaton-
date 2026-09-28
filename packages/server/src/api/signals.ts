import { Router } from "express";
import { z } from "zod";
import { SIGNAL_FREQUENCY_RANGE_HZ, SimulationEventType, UserRole } from "@avitronics/shared";
import { prisma } from "../db/client";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../auth/middleware";
import { eventBus } from "../events/EventBus";
import { simulationEngine } from "../engine/SimulationEngine";

export const signalsRouter = Router();

signalsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const unitId = req.query.unitId as string | undefined;
    const signals = await prisma.signal.findMany({
      where: unitId ? { unitId } : undefined,
      include: { antenna: true, direction: true, layer: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(signals);
  })
);

const frequencySchema = z
  .number()
  .min(SIGNAL_FREQUENCY_RANGE_HZ.min, `Frequency must be >= ${SIGNAL_FREQUENCY_RANGE_HZ.min} Hz (project simulation range)`)
  .max(SIGNAL_FREQUENCY_RANGE_HZ.max, `Frequency must be <= ${SIGNAL_FREQUENCY_RANGE_HZ.max} Hz (project simulation range)`);

const createSignalSchema = z.object({
  unitId: z.string().uuid(),
  antennaId: z.string().uuid(),
  directionId: z.string().uuid().nullable().optional(),
  layerId: z.string().uuid(),
  frequencyHz: frequencySchema,
  enabled: z.boolean().optional(),
});

signalsRouter.post(
  "/",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  asyncHandler(async (req, res) => {
    const input = createSignalSchema.parse(req.body);
    const signal = await prisma.signal.create({ data: { ...input, status: "IDLE" } });

    await prisma.configurationChange.create({
      data: {
        userId: req.user!.sub,
        userLabel: req.user!.displayName,
        action: "SIGNAL_CREATED",
        entityType: "Signal",
        entityId: signal.id,
        newValue: JSON.stringify(signal),
      },
    });
    await eventBus.publish({
      eventType: SimulationEventType.ConfigurationChanged,
      message: `Signal ${signal.id} created by ${req.user!.displayName}`,
      unitId: input.unitId,
      signalId: signal.id,
    });

    res.status(201).json(signal);
  })
);

const patchSignalSchema = z.object({
  frequencyHz: frequencySchema.optional(),
  enabled: z.boolean().optional(),
  status: z.string().optional(),
});

signalsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  asyncHandler(async (req, res) => {
    const input = patchSignalSchema.parse(req.body);
    const existing = await prisma.signal.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Signal not found");

    const updated = await prisma.signal.update({ where: { id: req.params.id }, data: input });

    await prisma.configurationChange.create({
      data: {
        userId: req.user!.sub,
        userLabel: req.user!.displayName,
        action: "SIGNAL_UPDATED",
        entityType: "Signal",
        entityId: updated.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
      },
    });
    await eventBus.publish({
      eventType: SimulationEventType.ConfigurationChanged,
      message: `USER: ${req.user!.displayName} | ACTION: Signal updated | UNIT: ${updated.unitId} | SIGNAL: ${updated.id} | OLD: ${existing.frequencyHz}Hz | NEW: ${updated.frequencyHz}Hz`,
      unitId: updated.unitId,
      signalId: updated.id,
    });

    // Push updated config into the running engine, if any, so a live demo
    // reflects operator changes without requiring a restart.
    await simulationEngine.reloadContext();

    res.json(updated);
  })
);
