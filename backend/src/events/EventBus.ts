import { EventEmitter } from "events";
import { v4 as uuid } from "uuid";
import { SimulationEventType, SimulationEventPayload } from "@avitronics/shared";
import { prisma } from "../db/client";
import { logger } from "../logging/logger";

export interface EmitEventInput<T = unknown> {
  eventType: SimulationEventType;
  message: string;
  simulationSessionId?: string | null;
  unitId?: string | null;
  signalId?: string | null;
  trackId?: string | null;
  objectId?: string | null;
  directionId?: string | null;
  antennaId?: string | null;
  alertId?: string | null;
  payload?: T;
}

/**
 * Central event bus for the simulation. Every meaningful lifecycle event
 * flows through here: it is persisted to `system_events` for audit/replay
 * and re-emitted in-process so the WebSocket layer (or anything else) can
 * broadcast it to connected clients. This keeps simulation logic decoupled
 * from transport concerns (see ARCHITECTURE.md).
 */
class SimulationEventBus extends EventEmitter {
  async publish<T>(input: EmitEventInput<T>): Promise<SimulationEventPayload<T>> {
    const event: SimulationEventPayload<T> = {
      eventId: uuid(),
      eventType: input.eventType,
      timestamp: new Date().toISOString(),
      simulationSessionId: input.simulationSessionId ?? null,
      unitId: input.unitId ?? null,
      signalId: input.signalId ?? null,
      trackId: input.trackId ?? null,
      objectId: input.objectId ?? null,
      directionId: input.directionId ?? null,
      antennaId: input.antennaId ?? null,
      alertId: input.alertId ?? null,
      message: input.message,
      payload: (input.payload ?? {}) as T,
    };

    try {
      await prisma.systemEvent.create({
        data: {
          id: event.eventId,
          eventType: event.eventType,
          timestamp: new Date(event.timestamp),
          unitId: event.unitId,
          signalId: event.signalId,
          trackId: event.trackId,
          objectId: event.objectId,
          directionId: event.directionId,
          antennaId: event.antennaId,
          alertId: event.alertId,
          simulationSessionId: event.simulationSessionId,
          message: event.message,
          payload: JSON.stringify(event.payload ?? {}),
        },
      });
    } catch (err) {
      // A persistence failure must never crash the simulation loop.
      logger.error("Failed to persist system event", { error: String(err), eventType: event.eventType });
    }

    this.emit("event", event);
    return event;
  }
}

export const eventBus = new SimulationEventBus();
eventBus.setMaxListeners(50);
