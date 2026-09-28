import { Router } from "express";
import { z } from "zod";
import { AlertStatus, SimulationEventType, UserRole } from "@avitronics/shared";
import { prisma } from "../db/client";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../auth/middleware";
import { eventBus } from "../events/EventBus";

export const alertsRouter = Router();

alertsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const alerts = await prisma.alert.findMany({
      where: status ? { status } : undefined,
      include: { track: true, direction: true, reviewedBy: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(alerts);
  })
);

const patchAlertSchema = z.object({
  status: z.nativeEnum(AlertStatus),
});

alertsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  asyncHandler(async (req, res) => {
    const { status } = patchAlertSchema.parse(req.body);
    const existing = await prisma.alert.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Alert not found");

    const updated = await prisma.alert.update({
      where: { id: req.params.id },
      data: { status, reviewedById: req.user!.sub },
    });

    await prisma.configurationChange.create({
      data: {
        userId: req.user!.sub,
        userLabel: req.user!.displayName,
        action: "ALERT_STATUS_CHANGED",
        entityType: "Alert",
        entityId: updated.id,
        oldValue: existing.status,
        newValue: status,
      },
    });

    await eventBus.publish({
      eventType: SimulationEventType.AlertAcknowledged,
      message: `Alert ${updated.code} marked ${status} by ${req.user!.displayName}`,
      trackId: updated.trackId,
      alertId: updated.id,
      unitId: updated.unitId,
    });

    res.json(updated);
  })
);
