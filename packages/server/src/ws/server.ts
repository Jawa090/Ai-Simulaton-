import { WebSocketServer, WebSocket } from "ws";
import { Server as HttpServer } from "http";
import { eventBus } from "../events/EventBus";
import { simulationEngine } from "../engine/SimulationEngine";
import { logger } from "../logging/logger";
import { WS_EVENT, WS_HELLO } from "@avitronics/shared";

/**
 * Broadcasts simulation events and per-tick object positions to all
 * connected dashboard clients. Chosen over polling so the frontend can
 * receive many rapid simulation events without hammering the REST API
 * (spec section 26).
 */
export function attachWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const broadcast = (type: string, data: unknown) => {
    const message = JSON.stringify({ type, data });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    });
  };

  eventBus.on("event", (event) => broadcast(WS_EVENT, event));
  simulationEngine.on("tick", (tickData) => broadcast("tick", tickData));

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: WS_HELLO, data: simulationEngine.getState() }));
    socket.on("error", (err) => logger.warn("WebSocket client error", { error: String(err) }));
  });

  logger.info("WebSocket server attached at /ws");
  return wss;
}
