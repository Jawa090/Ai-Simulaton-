import { prisma } from "../db/client";

export async function nextTrackCode(): Promise<string> {
  const count = await prisma.track.count();
  return `TRK-${String(count + 1).padStart(5, "0")}`;
}

export async function nextAlertCode(): Promise<string> {
  const count = await prisma.alert.count();
  return `ALERT-${String(count + 1).padStart(4, "0")}`;
}

export async function nextSimulationSessionCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.simulationSession.count();
  return `SIM-${year}-${String(count + 1).padStart(3, "0")}`;
}
