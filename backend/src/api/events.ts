import { Router } from "express";
import { prisma } from "../db/client";

export const eventsRouter = Router();

eventsRouter.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const simulationSessionId = req.query.simulationSessionId as string | undefined;
  const events = await prisma.systemEvent.findMany({
    where: simulationSessionId ? { simulationSessionId } : undefined,
    orderBy: { timestamp: "desc" },
    take: limit,
  });
  res.json(events.map((e) => ({ ...e, payload: JSON.parse(e.payload) })));
});

export const auditRouter = Router();

auditRouter.get("/", async (_req, res) => {
  const changes = await prisma.configurationChange.findMany({
    orderBy: { timestamp: "desc" },
    take: 200,
  });
  res.json(changes);
});
