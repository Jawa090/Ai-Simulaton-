import { Router } from "express";
import { z } from "zod";
import { ObjectType, UserRole } from "@avitronics/shared";
import { prisma } from "../db/client";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../auth/middleware";
import { simulationEngine } from "../engine/SimulationEngine";

export const objectsRouter = Router();

objectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const objects = await prisma.simObject.findMany({ orderBy: { spawnedAt: "desc" }, take: 200 });
    res.json(objects);
  })
);

const waypointSchema = z.object({ x: z.number(), y: z.number(), z: z.number() });

const spawnSchema = z.object({
  type: z.nativeEnum(ObjectType),
  label: z.string().optional(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  headingDeg: z.number().optional(),
  speedUnitsPerSec: z.number().positive().optional(),
  waypoints: z.array(waypointSchema).optional(),
});

objectsRouter.post(
  "/",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  asyncHandler(async (req, res) => {
    const state = simulationEngine.getState();
    if (state.state === "STOPPED") {
      throw new ApiError(409, "Simulation is not running. Start the simulation before spawning an object.");
    }
    const input = spawnSchema.parse(req.body);
    const runtime = await simulationEngine.spawnObject(input);
    res.status(201).json(runtime);
  })
);
