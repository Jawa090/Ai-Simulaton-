import { EventEmitter } from "events";
import {
  SimulationEventType,
  SignalStatus,
  TrackStatus,
  SimulationState,
  UnitStatus,
  SIMULATION_TICK_MS,
  LOCK_AFTER_DETECTION_COUNT,
  LOST_AFTER_MISSED_TICKS,
  CLOSE_AFTER_LOST_TICKS,
  OBJECT_PROFILE_DEFAULTS,
  ObjectType,
} from "@avitronics/shared";
import { prisma } from "../db/client";
import { eventBus } from "../events/EventBus";
import { logger } from "../logging/logger";
import { loadUnitContext, UnitRuntimeContext } from "./SimulationContext";
import { FieldEngine } from "./FieldEngine";
import { InteractionEngine } from "./InteractionEngine";
import { ObjectMotionEngine } from "./ObjectMotionEngine";
import { EstimationEngine } from "./EstimationEngine";
import { AlertEngine } from "./AlertEngine";
import { nextAlertCode, nextSimulationSessionCode, nextTrackCode } from "./codeGenerators";
import { ObjectRuntimeState, TrackRuntimeState, Waypoint } from "./types";

export interface SpawnObjectInput {
  type: ObjectType | string;
  label?: string;
  x: number;
  y: number;
  z: number;
  headingDeg?: number;
  speedUnitsPerSec?: number;
  waypoints?: Waypoint[];
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/**
 * Orchestrates the full software simulation pipeline for a single monitoring
 * unit: signal lifecycle -> field generation -> object motion -> field
 * interaction -> simulated echo -> detection -> tracking -> XYZ/T estimation
 * -> alerting -> event stream. See ARCHITECTURE.md for the module diagram.
 *
 * IMPORTANT: everything in this class is a software simulation. No real
 * signal, antenna, or hardware control is performed.
 */
export class SimulationEngine extends EventEmitter {
  private unitId: string | null = null;
  private ctx: UnitRuntimeContext | null = null;
  private sessionId: string | null = null;
  private sessionCode: string | null = null;
  private state: SimulationState = SimulationState.STOPPED;
  private speedMultiplier = 1;
  private simulatedTimeMs = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickInFlight = false;

  private objects = new Map<string, ObjectRuntimeState>();
  private tracksByObject = new Map<string, TrackRuntimeState>();

  getState() {
    return {
      state: this.state,
      simulationSessionId: this.sessionId,
      simulationSessionCode: this.sessionCode,
      speedMultiplier: this.speedMultiplier,
      simulatedTimeMs: this.simulatedTimeMs,
      unitId: this.unitId,
      activeObjectCount: Array.from(this.objects.values()).filter((o) => o.status === "ACTIVE").length,
    };
  }

  getObjectsSnapshot() {
    return Array.from(this.objects.values()).filter((o) => o.status === "ACTIVE");
  }

  async reloadContext() {
    if (this.unitId) {
      this.ctx = await loadUnitContext(this.unitId);
    }
  }

  async start(unitId: string, speedMultiplier = 1): Promise<void> {
    if (this.state === SimulationState.RUNNING) return;

    this.unitId = unitId;
    this.ctx = await loadUnitContext(unitId);
    this.speedMultiplier = speedMultiplier;
    this.simulatedTimeMs = 0;
    this.objects.clear();
    this.tracksByObject.clear();

    const code = await nextSimulationSessionCode();
    const session = await prisma.simulationSession.create({
      data: {
        code,
        state: SimulationState.RUNNING,
        speedMultiplier,
        configSnapshot: JSON.stringify(this.ctx),
      },
    });
    this.sessionId = session.id;
    this.sessionCode = session.code;
    this.state = SimulationState.RUNNING;

    await prisma.unit.update({ where: { id: unitId }, data: { status: UnitStatus.ACTIVE } });

    await this.activateAllSignals();

    await prisma.unit.update({ where: { id: unitId }, data: { status: UnitStatus.MONITORING } });

    await eventBus.publish({
      eventType: SimulationEventType.SimulationStarted,
      message: `Simulation session ${code} started on ${this.ctx.unitCode}`,
      simulationSessionId: this.sessionId,
      unitId,
    });

    this.timer = setInterval(() => this.runTickGuarded(), 200);
  }

  /** Ticks are never allowed to overlap: a slow tick (many objects/DB writes)
   * must finish before the next timer fire starts one, otherwise concurrent
   * ticks can race on sequence-derived codes (e.g. TRK-00001 assigned twice). */
  private runTickGuarded() {
    if (this.tickInFlight) return;
    this.tickInFlight = true;
    this.tick()
      .catch((err) => logger.error("Tick failed", { error: String(err) }))
      .finally(() => {
        this.tickInFlight = false;
      });
  }

  async pause(): Promise<void> {
    if (this.state !== SimulationState.RUNNING) return;
    this.state = SimulationState.PAUSED;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.sessionId) {
      await prisma.simulationSession.update({ where: { id: this.sessionId }, data: { state: SimulationState.PAUSED } });
      await eventBus.publish({
        eventType: SimulationEventType.SimulationPaused,
        message: "Simulation paused",
        simulationSessionId: this.sessionId,
        unitId: this.unitId,
      });
    }
  }

  async resume(): Promise<void> {
    if (this.state !== SimulationState.PAUSED) return;
    this.state = SimulationState.RUNNING;
    if (this.sessionId) {
      await prisma.simulationSession.update({ where: { id: this.sessionId }, data: { state: SimulationState.RUNNING } });
      await eventBus.publish({
        eventType: SimulationEventType.SimulationResumed,
        message: "Simulation resumed",
        simulationSessionId: this.sessionId,
        unitId: this.unitId,
      });
    }
    this.timer = setInterval(() => this.runTickGuarded(), 200);
  }

  async setSpeed(multiplier: number): Promise<void> {
    this.speedMultiplier = multiplier;
    if (this.sessionId) {
      await prisma.simulationSession.update({ where: { id: this.sessionId }, data: { speedMultiplier: multiplier } });
    }
  }

  async reset(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const wasSessionId = this.sessionId;
    const unitId = this.unitId;

    if (wasSessionId) {
      await prisma.simulationSession.update({
        where: { id: wasSessionId },
        data: { state: SimulationState.STOPPED, endedAt: new Date() },
      });
    }
    if (unitId && this.ctx) {
      await prisma.signal.updateMany({ where: { unitId }, data: { status: SignalStatus.IDLE } });
      await prisma.unit.update({ where: { id: unitId }, data: { status: UnitStatus.OFFLINE } });
    }

    await eventBus.publish({
      eventType: SimulationEventType.SimulationReset,
      message: "Simulation reset",
      simulationSessionId: wasSessionId,
      unitId,
    });

    this.objects.clear();
    this.tracksByObject.clear();
    this.simulatedTimeMs = 0;
    this.sessionId = null;
    this.sessionCode = null;
    this.state = SimulationState.STOPPED;
  }

  async spawnObject(input: SpawnObjectInput): Promise<ObjectRuntimeState> {
    const profile = OBJECT_PROFILE_DEFAULTS[input.type as ObjectType];
    const speed = input.speedUnitsPerSec ?? profile?.defaultSpeedUnitsPerSec ?? 5;
    const label = input.label ?? profile?.label ?? String(input.type);

    const row = await prisma.simObject.create({
      data: {
        type: String(input.type),
        label,
        currentX: input.x,
        currentY: input.y,
        currentZ: input.z,
        currentT: this.simulatedTimeMs,
        headingDeg: input.headingDeg ?? 0,
        speedUnitsPerSec: speed,
        status: "ACTIVE",
        simulationSessionId: this.sessionId,
      },
    });

    const runtime: ObjectRuntimeState = {
      id: row.id,
      type: row.type,
      label: row.label,
      x: row.currentX,
      y: row.currentY,
      z: row.currentZ,
      t: this.simulatedTimeMs,
      headingDeg: row.headingDeg,
      speedUnitsPerSec: row.speedUnitsPerSec,
      waypoints: input.waypoints ?? [],
      waypointIndex: 0,
      status: "ACTIVE",
    };
    (runtime as any).insideField = false;

    this.objects.set(row.id, runtime);

    await eventBus.publish({
      eventType: SimulationEventType.ObjectSpawned,
      message: `Object spawned: ${label}`,
      simulationSessionId: this.sessionId,
      objectId: row.id,
      payload: { type: row.type, x: row.currentX, y: row.currentY, z: row.currentZ },
    });

    return runtime;
  }

  private async activateAllSignals() {
    if (!this.ctx || !this.unitId) return;
    for (const signal of this.ctx.signals) {
      if (!signal.enabled) continue;
      await this.setSignalStatus(signal.id, SignalStatus.READY, signal.directionId, signal.antennaId);
      await this.setSignalStatus(signal.id, SignalStatus.TRANSMITTING, signal.directionId, signal.antennaId);
      await this.setSignalStatus(signal.id, SignalStatus.FIELD_ACTIVE, signal.directionId, signal.antennaId);
    }
    this.ctx = await loadUnitContext(this.unitId);
    await eventBus.publish({
      eventType: SimulationEventType.FieldActivated,
      message: `All configured directional fields active on ${this.ctx.unitCode}`,
      simulationSessionId: this.sessionId,
      unitId: this.unitId,
    });
  }

  private async setSignalStatus(signalId: string, status: SignalStatus, directionId?: string | null, antennaId?: string | null) {
    await prisma.signal.update({ where: { id: signalId }, data: { status } });
    await prisma.signalEvent.create({
      data: { signalId, stage: status, simulationSessionId: this.sessionId },
    });
    const eventTypeMap: Partial<Record<SignalStatus, SimulationEventType>> = {
      [SignalStatus.TRANSMITTING]: SimulationEventType.SignalTransmitted,
      [SignalStatus.INTERACTION_DETECTED]: SimulationEventType.SignalInteractionDetected,
      [SignalStatus.ECHO_RECEIVED]: SimulationEventType.SimulatedEchoReceived,
    };
    await eventBus.publish({
      eventType: eventTypeMap[status] ?? SimulationEventType.SignalActivated,
      message: `SIGNAL ${status}`,
      simulationSessionId: this.sessionId,
      unitId: this.unitId,
      signalId,
      directionId: directionId ?? undefined,
      antennaId: antennaId ?? undefined,
    });
  }

  private async tick() {
    if (this.state !== SimulationState.RUNNING || !this.ctx || !this.unitId) return;

    const dtMs = SIMULATION_TICK_MS * this.speedMultiplier;
    this.simulatedTimeMs += dtMs;

    const activeFields = FieldEngine.buildActiveFields(this.ctx);

    for (const object of this.objects.values()) {
      if (object.status !== "ACTIVE") continue;
      ObjectMotionEngine.advance(object, dtMs);

      const intersections = InteractionEngine.findIntersections(object, activeFields);
      const insideField = intersections.length > 0;
      const wasInsideField = Boolean((object as any).insideField);

      if (insideField) {
        if (!wasInsideField) {
          await eventBus.publish({
            eventType: SimulationEventType.ObjectEnteredField,
            message: `Object entered field ${intersections[0].directionCode}`,
            simulationSessionId: this.sessionId,
            unitId: this.unitId,
            objectId: object.id,
            directionId: intersections[0].directionId,
            antennaId: intersections[0].antennaId,
          });
        }
        (object as any).insideField = true;
        await this.processInteraction(object, intersections[0]);
      } else {
        if (wasInsideField) {
          await eventBus.publish({
            eventType: SimulationEventType.ObjectExitedField,
            message: `Object exited monitoring field`,
            simulationSessionId: this.sessionId,
            unitId: this.unitId,
            objectId: object.id,
          });
        }
        (object as any).insideField = false;
        await this.advanceMissedTick(object);
      }
    }

    this.emit("tick", {
      simulatedTimeMs: this.simulatedTimeMs,
      objects: this.getObjectsSnapshot(),
    });
  }

  private async processInteraction(object: ObjectRuntimeState, field: ReturnType<typeof FieldEngine.buildActiveFields>[number]) {
    if (!this.unitId) return;

    const interaction = await prisma.interaction.create({
      data: {
        unitId: this.unitId,
        directionId: field.directionId,
        antennaId: field.antennaId,
        signalId: field.signalId,
        objectId: object.id,
        x: object.x,
        y: object.y,
        z: object.z,
        t: object.t,
        simulationSessionId: this.sessionId,
      },
    });

    await this.setSignalStatus(field.signalId, SignalStatus.INTERACTION_DETECTED, field.directionId, field.antennaId);

    const est = EstimationEngine.estimate(0, 0, 0, object.x, object.y, object.z, hashSeed(interaction.id));

    await this.setSignalStatus(field.signalId, SignalStatus.ECHO_RECEIVED, field.directionId, field.antennaId);
    await this.setSignalStatus(field.signalId, SignalStatus.PROCESSING, field.directionId, field.antennaId);

    const existingTrack = this.tracksByObject.get(object.id);
    const isNewTrack = !existingTrack || existingTrack.status === TrackStatus.CLOSED;
    let track: TrackRuntimeState;

    if (isNewTrack) {
      const code = await nextTrackCode();
      const row = await prisma.track.create({
        data: {
          code,
          objectId: object.id,
          unitId: this.unitId,
          directionId: field.directionId,
          antennaId: field.antennaId,
          status: TrackStatus.DETECTED,
          currentX: object.x,
          currentY: object.y,
          currentZ: object.z,
          currentT: object.t,
          detectionCount: 1,
          simulationSessionId: this.sessionId,
        },
      });
      track = {
        id: row.id,
        code: row.code,
        objectId: object.id,
        unitId: this.unitId,
        directionId: field.directionId,
        antennaId: field.antennaId,
        status: TrackStatus.DETECTED,
        detectionCount: 1,
        missedTicks: 0,
        lostTicks: 0,
        lastActiveKey: `${field.directionId}:${field.antennaId}`,
      };
      this.tracksByObject.set(object.id, track);

      await eventBus.publish({
        eventType: SimulationEventType.TrackCreated,
        message: `TRACK CREATED: ${code}`,
        simulationSessionId: this.sessionId,
        unitId: this.unitId,
        trackId: row.id,
        objectId: object.id,
        directionId: field.directionId,
        antennaId: field.antennaId,
      });
    } else {
      track = existingTrack;
      track.detectionCount += 1;
      track.missedTicks = 0;
      track.directionId = field.directionId;
      track.antennaId = field.antennaId;
      await prisma.track.update({
        where: { id: track.id },
        data: {
          directionId: field.directionId,
          antennaId: field.antennaId,
          currentX: object.x,
          currentY: object.y,
          currentZ: object.z,
          currentT: object.t,
          lastDetectedAt: new Date(),
          detectionCount: track.detectionCount,
          missedTicks: 0,
          estimatedSpeed: object.speedUnitsPerSec,
          estimatedDirectionDeg: object.headingDeg,
        },
      });
    }

    await prisma.detection.create({
      data: {
        interactionId: interaction.id,
        trackId: track.id,
        unitId: this.unitId,
        directionId: field.directionId,
        antennaId: field.antennaId,
        estimatedX: est.estimatedX,
        estimatedY: est.estimatedY,
        estimatedZ: est.estimatedZ,
        estimatedRangeUnits: est.distanceUnits,
        echoDelayMs: est.echoDelayMs,
        simulationSessionId: this.sessionId,
      },
    });

    await prisma.trackPoint.create({
      data: {
        trackId: track.id,
        x: object.x,
        y: object.y,
        z: object.z,
        t: object.t,
        estimatedX: est.estimatedX,
        estimatedY: est.estimatedY,
        estimatedZ: est.estimatedZ,
      },
    });

    await this.setSignalStatus(field.signalId, SignalStatus.DETECTION, field.directionId, field.antennaId);
    await this.setSignalStatus(field.signalId, SignalStatus.TRACK_ASSOCIATION, field.directionId, field.antennaId);
    await this.setSignalStatus(field.signalId, SignalStatus.FIELD_ACTIVE, field.directionId, field.antennaId);

    if (!isNewTrack) {
      await eventBus.publish({
        eventType: SimulationEventType.TrackUpdated,
        message: `Track ${track.code} updated`,
        simulationSessionId: this.sessionId,
        unitId: this.unitId,
        trackId: track.id,
        objectId: object.id,
      });
    }

    await this.evaluateLockAndTracking(track, object);
  }

  private async evaluateLockAndTracking(track: TrackRuntimeState, object: ObjectRuntimeState) {
    if (track.status === TrackStatus.DETECTED && track.detectionCount >= LOCK_AFTER_DETECTION_COUNT) {
      track.status = TrackStatus.LOCKED;
      await prisma.track.update({ where: { id: track.id }, data: { status: TrackStatus.LOCKED } });
      await eventBus.publish({
        eventType: SimulationEventType.ObjectLocked,
        message: `OBJECT LOCKED: ${track.code}`,
        simulationSessionId: this.sessionId,
        unitId: this.unitId,
        trackId: track.id,
        objectId: object.id,
      });
      await this.generateAlert(track, object);
    } else if (track.status === TrackStatus.LOCKED) {
      track.status = TrackStatus.TRACKING;
      await prisma.track.update({ where: { id: track.id }, data: { status: TrackStatus.TRACKING } });
      await eventBus.publish({
        eventType: SimulationEventType.TrackUpdated,
        message: `CONTINUOUS TRACKING: ${track.code}`,
        simulationSessionId: this.sessionId,
        unitId: this.unitId,
        trackId: track.id,
        objectId: object.id,
      });
    }
  }

  private async generateAlert(track: TrackRuntimeState, object: ObjectRuntimeState) {
    const { severity, reason } = AlertEngine.classify(object.type);
    const code = await nextAlertCode();
    const alert = await prisma.alert.create({
      data: {
        code,
        trackId: track.id,
        objectType: object.type,
        unitId: track.unitId,
        directionId: track.directionId,
        x: object.x,
        y: object.y,
        z: object.z,
        t: object.t,
        severity,
        reason,
        status: "OPEN",
        simulationSessionId: this.sessionId,
      },
    });

    await eventBus.publish({
      eventType: SimulationEventType.AlertGenerated,
      message: `ALERT ${alert.code}: UNIDENTIFIED OBJECT DETECTED — TRACK ${track.code} — REQUIRES HUMAN REVIEW`,
      simulationSessionId: this.sessionId,
      unitId: track.unitId,
      trackId: track.id,
      objectId: object.id,
      alertId: alert.id,
      payload: { severity, reason, x: object.x, y: object.y, z: object.z, t: object.t },
    });
  }

  private async advanceMissedTick(object: ObjectRuntimeState) {
    const track = this.tracksByObject.get(object.id);
    if (!track) return;

    if (track.status === TrackStatus.LOST) {
      track.lostTicks += 1;
      if (track.lostTicks > CLOSE_AFTER_LOST_TICKS) {
        track.status = TrackStatus.CLOSED;
        await prisma.track.update({ where: { id: track.id }, data: { status: TrackStatus.CLOSED } });
        await eventBus.publish({
          eventType: SimulationEventType.TrackClosed,
          message: `Track ${track.code} closed`,
          simulationSessionId: this.sessionId,
          unitId: this.unitId,
          trackId: track.id,
          objectId: object.id,
        });
        object.status = "EXITED";
      }
      return;
    }

    if ([TrackStatus.DETECTED, TrackStatus.LOCKED, TrackStatus.TRACKING].includes(track.status as TrackStatus)) {
      track.missedTicks += 1;
      if (track.missedTicks > LOST_AFTER_MISSED_TICKS) {
        track.status = TrackStatus.LOST;
        track.lostTicks = 0;
        await prisma.track.update({ where: { id: track.id }, data: { status: TrackStatus.LOST } });
        await eventBus.publish({
          eventType: SimulationEventType.TrackLost,
          message: `Track ${track.code} lost (no recent detections)`,
          simulationSessionId: this.sessionId,
          unitId: this.unitId,
          trackId: track.id,
          objectId: object.id,
        });
      }
    }
  }
}

export const simulationEngine = new SimulationEngine();
simulationEngine.setMaxListeners(50);
