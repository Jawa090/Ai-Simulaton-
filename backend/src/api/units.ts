import { Router } from "express";
import { prisma } from "../db/client";
import { asyncHandler, ApiError } from "../middleware/errorHandler";

export const unitsRouter = Router();

unitsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const units = await prisma.unit.findMany({ orderBy: { code: "asc" } });
    const result = await Promise.all(
      units.map(async (u) => {
        const [antennaCount, activeSignals, activeTracks, openAlerts] = await Promise.all([
          prisma.antenna.count({ where: { unitId: u.id } }),
          prisma.signal.count({ where: { unitId: u.id }, }),
          prisma.track.count({ where: { unitId: u.id, status: { in: ["DETECTED", "LOCKED", "TRACKING"] } } }),
          prisma.alert.count({ where: { unitId: u.id, status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
        ]);
        return { ...u, antennaCount, activeSignals, activeTracks, openAlerts };
      })
    );
    res.json(result);
  })
);

unitsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const unit = await prisma.unit.findUnique({
      where: { id: req.params.id },
      include: {
        directions: true,
        antennas: { include: { layer: true, direction: true } },
        signals: true,
      },
    });
    if (!unit) throw new ApiError(404, "Unit not found");

    const activeTracks = await prisma.track.count({
      where: { unitId: unit.id, status: { in: ["DETECTED", "LOCKED", "TRACKING"] } },
    });

    res.json({ ...unit, activeTracks });
  })
);
