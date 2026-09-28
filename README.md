# EIGHTH AVITRONICS — Phase-1 Simulation Platform

> **SIMULATION ONLY.** This is a software prototype that demonstrates a conceptual
> ground-based monitoring/detection/tracking architecture. It does **not** control
> real radar hardware, RF transmitters, antennas, or any weapon/interception system.
> Every signal, echo, detection, and estimated position in this system is generated
> in software for demonstration purposes. See [docs/SIMULATION_MODEL.md](./docs/SIMULATION_MODEL.md)
> and section 42 of the original project brief for the full limitations statement.

## What this is

A full-stack simulation of a conceptual monitoring unit ("EIGHTH AVITRONICS UNIT-01")
that:

1. Models a unit with 18 directional antennas (6 directions × 3 antennas) plus a
   top-mounted omni transmitter, across 4 conceptual layers.
2. Generates simulated directional "monitoring fields" from configurable signal
   parameters (frequency range 2.2–2.7 kHz, a project-supplied simulation parameter).
3. Simulates flying objects (7 categories) moving through 3D space (X, Y, Z, T).
4. Detects when an object enters an active field, simulates a signal interaction and
   echo, creates a detection, and creates/updates a track.
5. Locks and continuously tracks the object, estimating XYZ/T (clearly labeled
   `SIMULATED / ESTIMATED / NOT FOR OPERATIONAL USE`).
6. Generates an alert once a track is locked, requiring human review — the system
   never takes or recommends a real-world action automatically.
7. Streams every step of this lifecycle to a live dashboard over WebSocket.

## Project structure

```
.
├── backend/                 Express API + simulation engine + WebSocket  (:4000)
│   ├── prisma/              Database schema (SQLite via Prisma)
│   ├── src/
│   │   ├── api/             REST routes, one file per resource
│   │   ├── auth/            JWT + role-based access middleware
│   │   ├── config/          Environment variables
│   │   ├── db/              Prisma client + seed script
│   │   ├── engine/          Simulation engines (motion, field, interaction, estimation, alerts)
│   │   ├── events/          EventBus — persists and broadcasts lifecycle events
│   │   ├── logging/         Structured logger
│   │   ├── middleware/      Error handling
│   │   ├── ws/              WebSocket server (/ws)
│   │   └── index.ts         Entry point
│   └── tests/               Vitest unit + end-to-end tests
│
├── frontend/                React + Vite dashboard  (:5173)
│   └── src/
│       ├── api/             HTTP client + response types
│       ├── auth/            Login state
│       ├── components/      Reusable UI panels
│       ├── hooks/           Shared React hooks
│       ├── pages/           One file per screen
│       ├── styles/          Theme CSS
│       ├── ws/              Live WebSocket connection
│       └── config.ts        Backend URL (VITE_API_URL)
│
├── shared/                  Types, enums and simulation defaults used by both sides
├── docs/                    Architecture + simulation model
├── render.yaml              Backend deployment (Render)
└── vercel.json              Frontend deployment (Vercel)
```

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the module breakdown and
[docs/SIMULATION_MODEL.md](./docs/SIMULATION_MODEL.md) for the signal/field/estimation model
and every value marked `ENGINEERING VALIDATION REQUIRED`.

## Requirements

- Node.js 18+
- npm 9+ (workspaces)

No external database server is required — the prototype uses a file-based SQLite
database via Prisma so it runs with zero infrastructure setup. The datasource can be
swapped to Postgres/MySQL later by changing `backend/prisma/schema.prisma`
and `DATABASE_URL`.

## Setup

```bash
# from the repository root
npm install

# configure the server environment (defaults are fine for local use)
cp backend/.env.example backend/.env

# create the SQLite schema and seed UNIT-01 (18 antennas, 6 directions,
# 18 signals, object profiles, demo users)
npm run db:push
npm run db:seed
```

## Running

```bash
# terminal 1 — API + simulation engine + WebSocket, http://localhost:4000
npm run dev:backend

# terminal 2 — dashboard, http://localhost:5173 (proxies /api and /ws to :4000)
npm run dev:frontend
```

Open http://localhost:5173 and sign in with one of the seeded demo accounts:

| Role     | Email                     | Password      |
|----------|---------------------------|---------------|
| ADMIN    | admin@avitronics.sim      | admin123      |
| OPERATOR | operator@avitronics.sim   | operator123   |
| VIEWER   | viewer@avitronics.sim     | viewer123     |

## Demo

From the Dashboard or Presentation Mode page, click **RUN DEMO** (requires an
OPERATOR or ADMIN session). This automatically:

1. Starts a simulation session on UNIT-01 and activates all configured signals.
2. Spawns a simulated drone on a course that crosses a directional field.
3. Lets the built-in engine take it through interaction → echo → detection →
   track creation → lock → continuous tracking → alert generation, all visible
   live in the Simulation View and the Live Event Stream.

You can also use the manual controls: START/PAUSE/RESUME/RESET, a speed
multiplier (0.5×–10×), and SPAWN OBJECT to introduce your own object type.

## Deployment

The two halves deploy to different hosts:

| Part | Host | Why |
|------|------|-----|
| `frontend/` | Vercel | Static React build |
| `backend/` | Render (or Railway / Fly.io) | Needs a long-running process and WebSockets, which Vercel does not support |

### 1. Backend on Render

1. In Render choose **New → Blueprint** and select this repo. It reads `render.yaml`.
2. When asked for `CORS_ORIGIN`, enter your Vercel URL (e.g. `https://your-app.vercel.app`).
   Several origins can be comma-separated.
3. Deploy, then check `https://<your-backend>.onrender.com/api/health` returns `{"status":"ok"}`.

On start the backend creates the SQLite schema and seeds UNIT-01 + demo users
(`npm run start:prod`). On Render's free plan the disk is not persistent, so the
database resets on every deploy/restart — attach a disk or move to Postgres for
lasting data.

### 2. Frontend on Vercel

1. Import the repo in Vercel. Leave **Root Directory** empty (repo root) — `vercel.json`
   already sets the build command and output folder.
2. Add the environment variable `VITE_API_URL` = your backend URL
   (e.g. `https://<your-backend>.onrender.com`, no trailing `/api`).
3. Deploy. REST calls and the `/ws` live stream both go to `VITE_API_URL`.

## Running tests

```bash
npm test
```

This runs:
- Unit tests for the motion, field, interaction, estimation, and alert-classification
  engines (no database required).
- An end-to-end lifecycle test against a disposable SQLite database: object spawn →
  field interaction → simulated echo → detection → track creation → lock →
  trajectory recording → alert generation.
- Simulation lifecycle tests (start/pause/resume/reset, signal activation).

## API overview

All endpoints are namespaced under `/api`. See route source under
`packages/server/src/api/*.ts` for the authoritative list; summary:

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/units`, `GET /api/units/:id`
- `GET /api/directions`, `GET /api/antennas`, `GET /api/layers`
- `GET /api/signals`, `POST /api/signals`, `PATCH /api/signals/:id`
- `GET /api/objects`, `POST /api/objects`
- `GET /api/tracks`, `GET /api/tracks/:id`, `GET /api/tracks/:id/history`
- `GET /api/detections`, `GET /api/interactions`
- `GET /api/alerts`, `PATCH /api/alerts/:id`
- `POST /api/simulation/start|pause|resume|reset|speed|demo`, `GET /api/simulation/state`
- `GET /api/events`, `GET /api/audit`
- `GET /api/config`, `PATCH /api/config/parameters/:key`

Mutating endpoints require a bearer token (`Authorization: Bearer <token>`) and
enforce role-based access (`ADMIN` / `OPERATOR` for control & configuration,
`VIEWER` for read-only access to everything).

Real-time updates (signal state, object positions, detections, track updates,
alerts, system events) are pushed over a WebSocket at `ws://localhost:4000/ws` —
see `packages/server/src/ws/server.ts`.

## Object types

Wide-body aircraft, narrow-body aircraft, low-range aircraft, drone, helicopter,
quadcopter, and small flying object — seven selectable categories (the project
brief said "6 types" but listed wide-body/narrow-body separately; both are kept
distinct rather than silently merged). See `packages/shared/src/config.ts` for
the altitude/speed simulation parameters for each.

## Configuration & extensibility

Everything that the project brief flagged as not-yet-engineering-confirmed is a
runtime, database-backed configuration value, not a hard-coded constant:

- Antenna → layer mapping (`antennas.layerId`)
- Directional field geometry — sector width, range, per-layer altitude bands
  (`simulation_parameters` table, key `field_geometry`)
- Signal frequency per antenna, within the project's 2.2–2.7 kHz simulation range
  (`signals.frequencyHz`, editable from the Configuration page)
- Object profile altitude bands / default speeds (`object_profiles` table)

All of these are visible and editable from the **Configuration** page (ADMIN/OPERATOR),
and every change is written to the `configuration_changes` audit table.

## Limitations (read before treating any output as real)

This is a Phase-1, 3-day software prototype. It is **not**:

- a certified radar system,
- a real RF system,
- an operational aviation detection system,
- an air-defense or autonomous-interception system.

All detection, signal interaction, tracking, and XYZ/T estimation are simulated
software constructs, built so the architecture, event flow, and presentation
concept can be demonstrated and later handed to engineering for validation
against real specifications (see `ENGINEERING VALIDATION REQUIRED` notes
throughout `packages/shared/src/config.ts` and SIMULATION_MODEL.md).

## Future integration points

- Swap `EstimationEngine` for a validated range/position model.
- Swap the field geometry / antenna-to-layer mapping for confirmed engineering
  values once available.
- Swap SQLite for Postgres/MySQL by changing the Prisma datasource.
- Add an IFF/whitelist integration so `AlertEngine` can distinguish known traffic
  from genuinely unidentified objects.
