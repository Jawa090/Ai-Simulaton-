import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { env } from "./config/env";
import { apiRouter } from "./api/router";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { attachWebSocketServer } from "./ws/server";
import { logger } from "./logging/logger";

const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use((req, _res, next) => {
  logger.debug("HTTP request", { method: req.method, path: req.path });
  next();
});

app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);
attachWebSocketServer(httpServer);

httpServer.listen(env.port, () => {
  logger.info(`EIGHTH AVITRONICS simulation server listening`, { port: env.port });
  logger.info("SIMULATION ONLY — no real hardware, RF, or radar control is performed by this system.");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason: String(reason) });
});
