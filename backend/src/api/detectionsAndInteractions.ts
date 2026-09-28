import { Router } from "express";
import { prisma } from "../db/client";

export const detectionsRouter = Router();
detectionsRouter.get("/", async (req, res) => {
  const trackId = req.query.trackId as string | undefined;
  const detections = await prisma.detection.findMany({
    where: trackId ? { trackId } : undefined,
    orderBy: { timestamp: "desc" },
    take: 200,
  });
  res.json(detections);
});

export const interactionsRouter = Router();
interactionsRouter.get("/", async (req, res) => {
  const unitId = req.query.unitId as string | undefined;
  const interactions = await prisma.interaction.findMany({
    where: unitId ? { unitId } : undefined,
    orderBy: { timestamp: "desc" },
    take: 200,
  });
  res.json(interactions);
});
