# Architecture — EIGHTH AVITRONICS Phase-1 Simulation

## Goals of this document

Explain how the system is put together and *why*, so the next engineer (or the
next AI session) can extend it without re-deriving the design. For the
signal/field/estimation model specifically, see [SIMULATION_MODEL.md](./SIMULATION_MODEL.md).

## High-level module diagram

```
                         ┌────────────────────────────┐
                         │        React Dashboard      │
                         │  (frontend)                  │
                         │  REST (polling, low freq)    │
                         │  WebSocket (live events/tick)│
                         └───────────────┬──────────────┘
                                         │ HTTP + WS
                         ┌───────────────▼──────────────┐
                         │        Express API            │
                         │  packages/server/src/api/*    │
                         │  auth, validation, RBAC        │
                         └───────────────┬──────────────┘
                                         │ calls
                         ┌───────────────▼──────────────┐
                         │      Simulation Engine         │
                         │  packages/server/src/engine/  │
                         │                                │
                         │  SignalEngine (lifecycle)      │
                         │  FieldEngine  (geometry)       │
                         │  ObjectMotionEngine            │
                         │  InteractionEngine             │
                         │  EstimationEngine              │
                         │  TrackingEngine (state machine)│
                         │  AlertEngine                   │
                         └───────┬───────────────┬────────┘
                                 │               │
                       ┌─────────▼───┐   ┌───────▼────────┐
                       │   EventBus   │   │  Prisma / SQLite│
                       │ (in-process) │   │  (packages/     │
                       │ persists +   │   │   server/prisma)│
                       │ broadcasts   │   └────────────────┘
                       └──────┬───────┘
                              │
                      ┌───────▼────────┐
                      │  WebSocket hub  │
                      │ (ws/server.ts)  │
                      └────────────────┘
```

Backend and frontend are fully separated processes communicating only over
HTTP/WebSocket — no simulation logic lives in the browser (spec section 38).
The frontend only renders state it is given; it never computes detections,
tracks, or estimates itself.

## Package layout

```
packages/
  shared/   Framework-free TypeScript: enums, SIMULATION PARAMETER config,
            shared DTO shapes. Imported by both server and web so the two
            never drift on event names, object types, or default values.

  server/
    prisma/schema.prisma   Relational schema (see below)
    src/
      config/env.ts         Process env (port, JWT secret, CORS origin)
      logging/logger.ts      Minimal structured (JSON-line) logger
      db/client.ts           Shared PrismaClient singleton
      db/seed.ts              Seeds UNIT-01, layers, directions, antennas,
                               signals, object profiles, demo users
      auth/                   JWT issuing/verification, bcrypt hashing,
                               requireAuth/requireRole middleware
      events/EventBus.ts       Central pub/sub: every lifecycle event is
                               persisted to `system_events` AND re-emitted
                               in-process for the WebSocket layer
      engine/                  See "Simulation engine" below
      api/                     One Express router per resource, thin —
                               all business logic stays in engine/ or
                               directly in Prisma queries for pure reads
      ws/server.ts             Broadcasts EventBus events + per-tick object
                               positions to all connected clients
      middleware/              Zod validation error mapping, async handler
                               wrapper, 404/500 handlers
      index.ts                 Process entrypoint: wires Express + http +
                               WebSocketServer together

  web/
    src/
      api/client.ts            Small fetch wrapper (adds bearer token)
      auth/AuthContext.tsx      Login state, current user/role
      ws/SimulationSocketContext.tsx  WebSocket connection, rolling event
                                buffer, latest per-tick object snapshot
      hooks/usePolling.ts       Low-frequency REST polling for slowly
                                changing list data (units, tracks, alerts) —
                                intentionally NOT a tight loop; live motion
                                comes from the WebSocket tick stream instead
      components/               Header, SimulationView (SVG schematic),
                                LiveDetectionsPanel, EventStream,
                                SimulationControls, UnitStatusPanel
      pages/                    Dashboard, UnitDetail, AntennaView,
                                TrackDetail, AlertCenter, Configuration,
                                Presentation, Login
```

## Simulation engine — responsibilities

Each engine module is a small, mostly-pure class so it can be unit tested and
later replaced without touching the others (spec section 27/37):

| Module | Responsibility | Replaceable for |
|---|---|---|
| `SimulationContext` (`loadUnitContext`) | Loads unit/direction/antenna/signal/geometry config from the DB into a flat runtime shape | swapping the config source (e.g. a different DB) |
| `FieldEngine` | Turns that config into active 3D field volumes (azimuth sector × range × altitude band) | a validated field-geometry model |
| `ObjectMotionEngine` | Advances an object's X/Y/Z along its waypoint trajectory at its configured speed | a physics-based flight model |
| `InteractionEngine` | Pure geometric containment test: is this object inside this field volume right now | a simulated-propagation / signal-strength model |
| `EstimationEngine` | Derives a simulated echo delay and a perturbed "estimated" XYZ from true position | a validated multilateration/triangulation model |
| `AlertEngine` | Classifies severity/reason once a track locks | an IFF/whitelist-aware classifier |
| `SimulationEngine` | Orchestrates all of the above on a fixed tick, owns the track state machine, session lifecycle (start/pause/resume/reset), and signal status lifecycle | — (this is the composition root) |

`SimulationEngine` runs a `setInterval` tick (wall-clock 200 ms) and advances
*simulated* time by `SIMULATION_TICK_MS * speedMultiplier` each tick, so the
0.5×–10× speed control changes how fast simulated time and object motion
progress without touching the timer itself.

### Why an in-process EventEmitter instead of a queue?

This is a single-process, 3-day prototype with a handful of simulated objects
at a time — a message broker would be unnecessary infrastructure (spec section
46). `EventBus` gives the same decoupling (engine code never imports the
WebSocket layer) at zero operational cost, and can be swapped for a real
broker later without changing any engine code, since engine modules only ever
call `eventBus.publish(...)`.

## Data model

See `packages/server/prisma/schema.prisma` for the full schema. It follows the
entity list from the project brief (`units`, `directions`, `antennas`,
`layers`, `signals`, `signal_events`, `objects` → `SimObject`, `tracks`,
`track_points`, `interactions`, `detections`, `alerts`, `simulation_sessions`,
`configuration_changes`, `system_events`, plus `users` and `object_profiles` /
`simulation_parameters` for editable config). Historical tables
(`signal_events`, `interactions`, `detections`, `track_points`,
`system_events`, `configuration_changes`) are append-only — nothing is
overwritten, so a simulation session can be replayed/audited after the fact.

## Real-time transport

A single `/ws` WebSocket endpoint carries two message types:

- `{"type": "event", "data": SimulationEventPayload}` — one per lifecycle
  event (signal state changes, detections, track updates, alerts, config
  changes, session control).
- `{"type": "tick", "data": {simulatedTimeMs, objects}}` — one per simulation
  tick, carrying live X/Y/Z for every active object, for smooth motion in the
  Simulation View without any client-side polling.

The frontend never polls faster than a few seconds for anything (spec section
26); all sub-second updates arrive over this socket.

## Auth & roles

JWT-based session (`packages/server/src/auth`), three roles matching the
brief: `ADMIN` (full configuration), `OPERATOR` (simulation control + signal/
object-profile configuration), `VIEWER` (read-only). Role checks are
middleware (`requireRole(...)`) applied per-route; every mutating
configuration or alert-review action also writes a `configuration_changes`
row for the audit trail.

## Testing strategy

- **Unit tests** (`tests/engines.test.ts`) exercise `ObjectMotionEngine`,
  `FieldEngine`, `InteractionEngine`, `EstimationEngine`, and `AlertEngine` in
  isolation with fabricated inputs — no database.
- **End-to-end test** (`tests/e2e.test.ts`) drives the real `SimulationEngine`
  against a disposable SQLite database and asserts the full chain: object
  spawn → interaction → echo/detection → track creation → lock → trajectory
  history → alert.
- **Lifecycle tests** (`tests/simulationLifecycle.test.ts`) cover
  start/pause/resume/reset and signal activation.

Test files share one SQLite file and the seeded `UNIT-01`, so
`vitest.config.ts` disables file parallelism — running them concurrently
would race on the same rows.
