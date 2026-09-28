import { Router } from "express";
import { prisma } from "../db/client";
import { ApiError, asyncHandler } from "../middleware/errorHandler";

export const tracksRouter = Router();

tracksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const tracks = await prisma.track.findMany({
      where: status ? { status } : undefined,
      include: { object: true, direction: true, antenna: true },
      orderBy: { lastDetectedAt: "desc" },
      take: 200,
    });
    res.json(tracks);
  })
);

tracksRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const track = await prisma.track.findUnique({
      where: { id: req.params.id },
      include: { object: true, direction: true, antenna: true, unit: true },
    });
    if (!track) throw new ApiError(404, "Track not found");
    res.json(track);
  })
);

tracksRouter.get(
  "/:id/history",
  asyncHandler(async (req, res) => {
    const points = await prisma.trackPoint.findMany({
      where: { trackId: req.params.id },
      orderBy: { recordedAt: "asc" },
    });
    res.json(points);
  })
);
