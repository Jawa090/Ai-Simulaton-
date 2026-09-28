import {
  DEFAULT_ANTENNA_LAYER_ORDER,
  DEFAULT_FIELD_GEOMETRY,
  DirectionCode,
  LayerCode,
  OBJECT_PROFILE_DEFAULTS,
  SIGNAL_FREQUENCY_RANGE_HZ,
  UserRole,
} from "@avitronics/shared";
import { prisma } from "./client";
import { hashPassword } from "../auth/auth";

const LAYER_DEFS: Array<{ code: LayerCode; name: string; sortOrder: number; description: string }> = [
  { code: LayerCode.LAYER_1_OMNI, name: "Layer 1 — Omni Transmitter", sortOrder: 1, description: "Top-mounted omni transmitter/receiver element." },
  { code: LayerCode.LAYER_2_HIGH_ALTITUDE, name: "Layer 2 — High-Altitude", sortOrder: 2, description: "High-altitude simulated signal/detection band." },
  { code: LayerCode.LAYER_3_HORIZON, name: "Layer 3 — Horizon", sortOrder: 3, description: "Horizon-level simulated detection band." },
  { code: LayerCode.LAYER_4_NEARBY_ALTITUDE, name: "Layer 4 — Nearby-Altitude", sortOrder: 4, description: "Nearby, low-altitude simulated detection band." },
];

const DIRECTION_CODES = Object.values(DirectionCode);

async function main() {
  console.log("Seeding EIGHTH AVITRONICS simulation database (SIMULATION DATA ONLY)...");

  // --- Users -----------------------------------------------------------
  const users: Array<{ email: string; displayName: string; role: UserRole; password: string }> = [
    { email: "admin@avitronics.sim", displayName: "Admin Operator", role: UserRole.ADMIN, password: "admin123" },
    { email: "operator@avitronics.sim", displayName: "Operator-01", role: UserRole.OPERATOR, password: "operator123" },
    { email: "viewer@avitronics.sim", displayName: "Viewer-01", role: UserRole.VIEWER, password: "viewer123" },
  ];
  for (const u of users) {
    const passwordHash = await hashPassword(u.password);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, displayName: u.displayName, role: u.role, passwordHash },
    });
  }

  // --- Layers ------------------------------------------------------------
  const layerByCode = new Map<string, string>();
  for (const l of LAYER_DEFS) {
    const layer = await prisma.layer.upsert({
      where: { code: l.code },
      update: {},
      create: { code: l.code, name: l.name, sortOrder: l.sortOrder, description: l.description },
    });
    layerByCode.set(l.code, layer.id);
  }

  // --- Unit ----------------------------------------------------------------
  const unit = await prisma.unit.upsert({
    where: { code: "UNIT-01" },
    update: {},
    create: { code: "UNIT-01", name: "Ground Monitoring Unit 01", status: "OFFLINE" },
  });

  // --- Directions (6, evenly spaced placeholder azimuths) -------------------
  const directions = [];
  for (let i = 0; i < DIRECTION_CODES.length; i++) {
    const azimuthCenterDeg = i * (360 / DIRECTION_CODES.length);
    const direction = await prisma.direction.upsert({
      where: { unitId_code: { unitId: unit.id, code: DIRECTION_CODES[i] } },
      update: {},
      create: {
        unitId: unit.id,
        code: DIRECTION_CODES[i],
        azimuthCenterDeg,
        sectorWidthDeg: DEFAULT_FIELD_GEOMETRY.sectorWidthDeg,
        rangeUnits: DEFAULT_FIELD_GEOMETRY.rangeUnits,
      },
    });
    directions.push(direction);
  }

  // --- Omni transmitter (Layer 1, not one of the 18) ------------------------
  const omniAntenna = await prisma.antenna.upsert({
    where: { unitId_code: { unitId: unit.id, code: "ANT-OMNI" } },
    update: {},
    create: {
      unitId: unit.id,
      code: "ANT-OMNI",
      directionId: null,
      layerId: layerByCode.get(LayerCode.LAYER_1_OMNI)!,
      isOmni: true,
    },
  });

  // --- 18 directional antennas: 3 per direction, one per Layer 2/3/4 -------
  // DEFAULT/PLACEHOLDER mapping — ENGINEERING VALIDATION REQUIRED (see
  // packages/shared/src/config.ts DEFAULT_ANTENNA_LAYER_ORDER).
  let antennaCounter = 1;
  const freqSpan = SIGNAL_FREQUENCY_RANGE_HZ.max - SIGNAL_FREQUENCY_RANGE_HZ.min;
  let signalIndex = 0;
  const totalSignals = directions.length * DEFAULT_ANTENNA_LAYER_ORDER.length;

  for (const direction of directions) {
    for (const layerCode of DEFAULT_ANTENNA_LAYER_ORDER) {
      const code = `ANT-${String(antennaCounter).padStart(2, "0")}`;
      antennaCounter++;
      const antenna = await prisma.antenna.upsert({
        where: { unitId_code: { unitId: unit.id, code } },
        update: {},
        create: {
          unitId: unit.id,
          code,
          directionId: direction.id,
          layerId: layerByCode.get(layerCode)!,
          isOmni: false,
        },
      });

      const frequencyHz =
        SIGNAL_FREQUENCY_RANGE_HZ.min + (freqSpan * signalIndex) / Math.max(1, totalSignals - 1);
      signalIndex++;

      const existingSignal = await prisma.signal.findFirst({ where: { antennaId: antenna.id } });
      if (!existingSignal) {
        await prisma.signal.create({
          data: {
            unitId: unit.id,
            directionId: direction.id,
            antennaId: antenna.id,
            layerId: layerByCode.get(layerCode)!,
            frequencyHz: Math.round(frequencyHz * 100) / 100,
            status: "IDLE",
            enabled: true,
          },
        });
      }
    }
  }

  // --- Object profiles (editable copies of the shared defaults) ------------
  for (const profile of Object.values(OBJECT_PROFILE_DEFAULTS)) {
    await prisma.objectProfile.upsert({
      where: { type: profile.type },
      update: {},
      create: {
        type: profile.type,
        label: profile.label,
        minAltitudeUnits: profile.minAltitudeUnits,
        maxAltitudeUnits: profile.maxAltitudeUnits,
        defaultSpeedUnitsPerSec: profile.defaultSpeedUnitsPerSec,
        note: profile.note,
      },
    });
  }

  // --- Simulation parameters (editable defaults) ----------------------------
  await prisma.simulationParameter.upsert({
    where: { key: "field_geometry" },
    update: {},
    create: {
      key: "field_geometry",
      value: JSON.stringify(DEFAULT_FIELD_GEOMETRY),
      description: "Directional field sector width, range, and per-layer altitude bands. SIMULATION PARAMETER.",
    },
  });

  console.log(`Seed complete: ${unit.code}, ${directions.length} directions, ${antennaCounter - 1} directional antennas + 1 omni, ${signalIndex} signals.`);
  console.log("Seeded users: admin@avitronics.sim / operator@avitronics.sim / viewer@avitronics.sim");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
