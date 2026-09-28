/**
 * EIGHTH AVITRONICS — shared enumerations.
 * SIMULATION ONLY. No values here represent validated real-world specifications.
 */

export enum ObjectType {
  WIDE_BODY_AIRCRAFT = "WIDE_BODY_AIRCRAFT",
  NARROW_BODY_AIRCRAFT = "NARROW_BODY_AIRCRAFT",
  LOW_RANGE_AIRCRAFT = "LOW_RANGE_AIRCRAFT",
  DRONE = "DRONE",
  HELICOPTER = "HELICOPTER",
  QUADCOPTER = "QUADCOPTER",
  SMALL_FLYING_OBJECT = "SMALL_FLYING_OBJECT",
}

export enum TrackStatus {
  DETECTED = "DETECTED",
  LOCKED = "LOCKED",
  TRACKING = "TRACKING",
  LOST = "LOST",
  EXITED = "EXITED",
  CLOSED = "CLOSED",
}

export enum SignalStatus {
  IDLE = "IDLE",
  READY = "READY",
  TRANSMITTING = "TRANSMITTING",
  FIELD_ACTIVE = "FIELD_ACTIVE",
  INTERACTION_DETECTED = "INTERACTION_DETECTED",
  ECHO_RECEIVED = "ECHO_RECEIVED",
  PROCESSING = "PROCESSING",
  DETECTION = "DETECTION",
  TRACK_ASSOCIATION = "TRACK_ASSOCIATION",
  DISABLED = "DISABLED",
}

export enum AlertSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum AlertStatus {
  OPEN = "OPEN",
  UNDER_REVIEW = "UNDER_REVIEW",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  CLOSED = "CLOSED",
}

export enum UserRole {
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
  VIEWER = "VIEWER",
}

export enum UnitStatus {
  OFFLINE = "OFFLINE",
  INITIALIZING = "INITIALIZING",
  ACTIVE = "ACTIVE",
  SIGNALING = "SIGNALING",
  MONITORING = "MONITORING",
  FAULT = "FAULT",
}

export enum SimulationState {
  STOPPED = "STOPPED",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
}

/** Conceptual layer identifiers. The mapping of physical antennas to layers
 * is a CONFIGURABLE DATA MODEL (see antenna.layerId), never hard-coded logic. */
export enum LayerCode {
  LAYER_1_OMNI = "LAYER_1_OMNI",
  LAYER_2_HIGH_ALTITUDE = "LAYER_2_HIGH_ALTITUDE",
  LAYER_3_HORIZON = "LAYER_3_HORIZON",
  LAYER_4_NEARBY_ALTITUDE = "LAYER_4_NEARBY_ALTITUDE",
}

export enum DirectionCode {
  DIR_01 = "DIR-01",
  DIR_02 = "DIR-02",
  DIR_03 = "DIR-03",
  DIR_04 = "DIR-04",
  DIR_05 = "DIR-05",
  DIR_06 = "DIR-06",
}

export enum SimulationEventType {
  SignalActivated = "SignalActivated",
  SignalTransmitted = "SignalTransmitted",
  FieldActivated = "FieldActivated",
  FieldDeactivated = "FieldDeactivated",
  ObjectSpawned = "ObjectSpawned",
  ObjectEnteredField = "ObjectEnteredField",
  SignalInteractionDetected = "SignalInteractionDetected",
  SimulatedEchoReceived = "SimulatedEchoReceived",
  ObjectDetected = "ObjectDetected",
  TrackCreated = "TrackCreated",
  TrackUpdated = "TrackUpdated",
  ObjectLocked = "ObjectLocked",
  ObjectExitedField = "ObjectExitedField",
  TrackLost = "TrackLost",
  TrackClosed = "TrackClosed",
  AlertGenerated = "AlertGenerated",
  AlertAcknowledged = "AlertAcknowledged",
  ConfigurationChanged = "ConfigurationChanged",
  SimulationStarted = "SimulationStarted",
  SimulationPaused = "SimulationPaused",
  SimulationResumed = "SimulationResumed",
  SimulationReset = "SimulationReset",
}
