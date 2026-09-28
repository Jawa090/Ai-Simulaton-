import { Router } from "express";
import { authRouter } from "./auth";
import { unitsRouter } from "./units";
import { directionsRouter } from "./directions";
import { antennasRouter, layersRouter } from "./antennas";
import { signalsRouter } from "./signals";
import { objectsRouter } from "./objects";
import { tracksRouter } from "./tracks";
import { detectionsRouter, interactionsRouter } from "./detectionsAndInteractions";
import { alertsRouter } from "./alerts";
import { simulationRouter } from "./simulation";
import { eventsRouter, auditRouter } from "./events";
import { configRouter } from "./config";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/units", unitsRouter);
apiRouter.use("/directions", directionsRouter);
apiRouter.use("/antennas", antennasRouter);
apiRouter.use("/layers", layersRouter);
apiRouter.use("/signals", signalsRouter);
apiRouter.use("/objects", objectsRouter);
apiRouter.use("/tracks", tracksRouter);
apiRouter.use("/detections", detectionsRouter);
apiRouter.use("/interactions", interactionsRouter);
apiRouter.use("/alerts", alertsRouter);
apiRouter.use("/simulation", simulationRouter);
apiRouter.use("/events", eventsRouter);
apiRouter.use("/audit", auditRouter);
apiRouter.use("/config", configRouter);

apiRouter.get("/health", (_req, res) => res.json({ status: "ok", service: "eighth-avitronics-server" }));
