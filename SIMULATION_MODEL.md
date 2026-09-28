# Simulation Model — EIGHTH AVITRONICS Phase-1

Everything in this document describes **software simulation behavior**, not a
validated radar/RF/antenna specification. Every numeric constant is a
placeholder needed to make the simulation demonstrable and is flagged
`ENGINEERING VALIDATION REQUIRED`. Source of truth for the current values:
`packages/shared/src/config.ts` (defaults) and the `object_profiles` /
`simulation_parameters` database tables (the live, editable copies the app
actually reads).

## Coordinate system

- The monitoring unit sits at the origin `(0, 0)` of an arbitrary X/Y plane.
  `Z` is a simulated altitude unit, `T` is simulated milliseconds since the
  current simulation session began.
- Units are **not to scale** and do not correspond to any real distance —
  every simulation view is labeled `SIMULATION / NOT TO SCALE`.
- Azimuth is measured the standard math way (`atan2(y, x)`, degrees,
  0–360, increasing counter-clockwise from +X). This is an implementation
  convenience, not a north-referenced bearing.

## Unit structure (spec section 2)

- 1 top-mounted **omni transmitter** (Layer 1), modeled as an `Antenna` row
  with `isOmni = true` and no `directionId`. It does not define a directional
  field in this Phase-1 model — it exists in the data model so a future
  engineering pass can decide its role.
- 18 **directional antennas**, 3 per direction × 6 directions.
- **`ENGINEERING VALIDATION REQUIRED`**: the mapping of those 3 antennas per
  direction onto Layer 2 (high-altitude), Layer 3 (horizon), and Layer 4
  (nearby-altitude) is a configurable default
  (`DEFAULT_ANTENNA_LAYER_ORDER` in `packages/shared/src/config.ts`,
  materialized as `antennas.layerId` in the database) — **not** an assumed
  physical fact. It can be changed per-antenna without a code change.

## Signal model (spec section 5–6)

- Conceptual frequency range: **2.2 kHz – 2.7 kHz** (`SIGNAL_FREQUENCY_RANGE_HZ`).
  This is the range supplied by the project brief, treated purely as a
  simulation parameter; no signal is ever actually transmitted.
- The seed script assigns each of the 18 signals an evenly-spaced frequency
  within that range. Frequencies are editable per-signal from the
  Configuration page (ADMIN/OPERATOR) and validated server-side to stay
  within the configured range.
- Signal lifecycle (`SignalStatus` enum), applied and logged with a
  timestamped `SignalEvent` row + broadcast event at every transition:

  ```
  IDLE → READY → TRANSMITTING → FIELD_ACTIVE
       → INTERACTION_DETECTED → ECHO_RECEIVED → PROCESSING
       → DETECTION → TRACK_ASSOCIATION → (back to FIELD_ACTIVE)
  ```

  `READY`/`TRANSMITTING`/`FIELD_ACTIVE` happen once per signal when a
  simulation session starts (`SimulationEngine.activateAllSignals`). The
  `INTERACTION_DETECTED … TRACK_ASSOCIATION` sub-sequence happens every time
  that signal's field is intersected by a simulated object.

## Monitoring field geometry (spec section 7)

A directional field volume is a simple geometric wedge, not a physical RF
propagation model:

- **Azimuth sector**: `direction.azimuthCenterDeg ± direction.sectorWidthDeg / 2`.
- **Radial range**: `0 … direction.rangeUnits`.
- **Altitude band**: per-layer `minAltitudeUnits … maxAltitudeUnits`
  (`simulation_parameters` key `field_geometry`, default
  `DEFAULT_FIELD_GEOMETRY`).

`ENGINEERING VALIDATION REQUIRED`: sector width (default 60°), range (default
400 simulation units), and the three layer altitude bands are all
placeholders pending real antenna/coverage specifications.

## Object simulation (spec section 3, 8, 13)

Seven selectable object categories (`ObjectType`), each with an
`ENGINEERING VALIDATION REQUIRED` altitude band and default speed converted
from the project brief's approximate real-world feet ranges into arbitrary
simulation altitude units:

| Type | Brief altitude | Sim altitude band | Default speed |
|---|---|---|---|
| Wide-body aircraft | 10,000 ft+ | 300–500 | 18/s |
| Narrow-body aircraft | 10,000 ft+ | 300–480 | 16/s |
| Low-range aircraft | 5,000–10,000 ft | 150–300 | 12/s |
| Drone | 5,000–15,000 ft | 150–450 | 6/s |
| Helicopter | below 7,000 ft | 0–210 | 8/s |
| Quadcopter | ~2,000 ft | 0–60 | 4/s |
| Small flying object | ~1,000 ft | 0–30 | 3/s |

An object moves along a list of waypoints at its configured speed
(`ObjectMotionEngine`); after the final waypoint it continues straight on its
last heading. Every tick produces a new `(x, y, z, t)` sample.

## Detection, echo, and distance/time model (spec section 9, 12)

1. **Interaction**: a pure containment test — is the object's current
   `(x, y, z)` inside any active field volume (`InteractionEngine`). No
   simulated RF wave is generated or propagated; this models the *outcome* of
   an interaction, not the physics of one.
2. **Simulated echo delay**: `EstimationEngine` computes
   `distance = |unit_position − object_position|` and
   `echoDelayMs = (2 × distance) / SIMULATED_PROPAGATION_UNITS_PER_MS`.
   `SIMULATED_PROPAGATION_UNITS_PER_MS` (default 50) is an abstract
   placeholder constant — **not** the speed of light, sound, or any real
   propagation medium. `ENGINEERING VALIDATION REQUIRED`.
3. **Detection**: a `Detection` row is written with the computed delay,
   distance, and an "estimated" position (see below).

## XYZ/T estimation (spec section 11)

`EstimationEngine.estimate(...)` returns the object's true simulated position
perturbed by a small deterministic pseudo-random offset
(`SIMULATED_ESTIMATION_NOISE_UNITS`, default ±4 units), seeded from the
interaction ID so results are reproducible in tests. This exists purely to
make the UI visibly show "the system derived a position" rather than "the UI
just echoes ground truth" — it is **not** a validated estimation/triangulation
algorithm. Every place this value is surfaced in the UI is labeled:

```
SIMULATED / ESTIMATED / NOT FOR OPERATIONAL USE
```

`EstimationEngine` is intentionally the single, isolated place this
calculation happens, so it can be replaced with a validated model without
touching `InteractionEngine`, `TrackingEngine`, or the API layer.

## Tracking state machine (spec section 10)

```
DETECTED --(reaches LOCK_AFTER_DETECTION_COUNT detections)--> LOCKED
LOCKED --(next successful detection)--> TRACKING
TRACKING --(no detection for > LOST_AFTER_MISSED_TICKS ticks)--> LOST
LOST --(no detection for > CLOSE_AFTER_LOST_TICKS more ticks)--> CLOSED
(DETECTED/LOCKED/TRACKING) --(no detection for > LOST_AFTER_MISSED_TICKS ticks)--> LOST
```

Defaults (`packages/shared/src/config.ts`): lock after 2 detections, lost
after 5 missed ticks, closed after 10 further missed ticks. All
`ENGINEERING VALIDATION REQUIRED` — there is no validated basis for these
thresholds beyond "produces a demonstrable lifecycle."

## Alerting (spec section 14)

`AlertEngine.classify` runs once, when a track transitions to `LOCKED`. Every
locked track generates exactly one alert marked `REQUIRES HUMAN REVIEW`,
because this Phase-1 system has no IFF/whitelist integration and therefore
cannot distinguish known/authorized traffic from a genuinely unidentified
object — every detection is treated as unidentified by design. Severity is a
simple heuristic (small/uncrewed categories → `HIGH`, larger aircraft →
`MEDIUM`) and is **not** a validated threat assessment. The system never
recommends or performs any real-world action; the terminal state of every
alert is a human decision (`OPEN → UNDER_REVIEW → ACKNOWLEDGED → CLOSED`).

## Summary of `ENGINEERING VALIDATION REQUIRED` items

- Antenna → layer mapping (`DEFAULT_ANTENNA_LAYER_ORDER`)
- Directional field geometry: sector width, range, per-layer altitude bands
- Per-signal frequency assignment within the 2.2–2.7 kHz band
- Object profile altitude bands and default speeds
- Simulated propagation constant used for echo delay
- Simulated estimation noise magnitude
- Lock/lost/close tick thresholds
- Alert severity heuristic

All of the above are represented as data (database rows or named constants),
never as inline magic numbers in engine logic, specifically so they can be
replaced by engineering-confirmed values without a rewrite.
