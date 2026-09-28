import { Router } from "express";
import { prisma } from "../db/client";

export const antennasRouter = Router();

antennasRouter.get("/", async (req, res) => {
  const unitId = req.query.unitId as string | undefined;
  const antennas = await prisma.antenna.findMany({
    where: unitId ? { unitId } : undefined,
    include: { layer: true, direction: true },
    orderBy: { code: "asc" },
  });
  res.json(antennas);
});

export const layersRouter = Router();

layersRouter.get("/", async (_req, res) => {
  const layers = await prisma.layer.findMany({ orderBy: { sortOrder: "asc" } });
  res.json(layers);
});
