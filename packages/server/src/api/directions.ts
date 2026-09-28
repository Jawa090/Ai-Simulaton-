import { Router } from "express";
import { prisma } from "../db/client";

export const directionsRouter = Router();

directionsRouter.get("/", async (req, res) => {
  const unitId = req.query.unitId as string | undefined;
  const directions = await prisma.direction.findMany({
    where: unitId ? { unitId } : undefined,
    orderBy: { code: "asc" },
  });

  const result = await Promise.all(
    directions.map(async (d) => {
      const [antennas, signals, interactions, detections] = await Promise.all([
        prisma.antenna.findMany({ where: { directionId: d.id } }),
        prisma.signal.findMany({ where: { directionId: d.id } }),
        prisma.interaction.count({ where: { directionId: d.id } }),
        prisma.detection.count({ where: { directionId: d.id } }),
      ]);
      return { ...d, antennas, signals, interactionCount: interactions, detectionCount: detections };
    })
  );

  res.json(result);
});
