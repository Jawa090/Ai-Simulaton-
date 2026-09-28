import { Router } from "express";
import { z } from "zod";
import { SIMULATION_SPEED_MULTIPLIERS, UserRole } from "@avitronics/shared";
import { prisma } from "../db/client";
import { simulationEngine } from "../engine/SimulationEngine";
import { runDemoScenario } from "../engine/demoScenario";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../auth/middleware";

export const simulationRouter = Router();

simulationRouter.get("/state", (_req, res) => {
  res.json(simulationEngine.getState());
});

simulationRouter.get("/objects", (_req, res) => {
  res.json(simulationEngine.getObjectsSnapshot());
});

const startSchema = z.object({
  unitId: z.string().uuid().optional(),
  speedMultiplier: z.number().refine((v) => (SIMULATION_SPEED_MULTIPLIERS as readonly number[]).includes(v), {
    message: `speedMultiplier must be one of ${SIMULATION_SPEED_MULTIPLIERS.join(", ")}`,
  }).optional(),
});

simulationRouter.post(
  "/start",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  asyncHandler(async (req, res) => {
    const { unitId, speedMultiplier } = startSchema.parse(req.body ?? {});
    let targetUnitId = unitId;
    if (!targetUnitId) {
      const unit = await prisma.unit.findFirst({ orderBy: { code: "asc" } });
      if (!unit) throw new ApiError(400, "No unit configured. Run the database seed first.");
      targetUnitId = unit.id;
    }
    await simulationEngine.start(targetUnitId, speedMultiplier ?? 1);
    res.json(simulationEngine.getState());
  })
);

simulationRouter.post(
  "/pause",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  asyncHandler(async (_req, res) => {
    await simulationEngine.pause();
    res.json(simulationEngine.getState());
  })
);

simulationRouter.post(
  "/resume",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  asyncHandler(async (_req, res) => {
    await simulationEngine.resume();
    res.json(simulationEngine.getState());
  })
);

simulationRouter.post(
  "/reset",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  asyncHandler(async (_req, res) => {
    await simulationEngine.reset();
    res.json(simulationEngine.getState());
  })
);

const speedSchema = z.object({
  speedMultiplier: z.number().refine((v) => (SIMULATION_SPEED_MULTIPLIERS as readonly number[]).includes(v)),
});

simulationRouter.post(
  "/speed",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  asyncHandler(async (req, res) => {
    const { speedMultiplier } = speedSchema.parse(req.body);
    await simulationEngine.setSpeed(speedMultiplier);
    res.json(simulationEngine.getState());
  })
);

simulationRouter.post(
  "/demo",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  asyncHandler(async (_req, res) => {
    const result = await runDemoScenario();
    res.json(result);
  })
);

simulationRouter.get(
  "/sessions",
  asyncHandler(async (_req, res) => {
    const sessions = await prisma.simulationSession.findMany({ orderBy: { startedAt: "desc" }, take: 50 });
    res.json(sessions);
  })
);
