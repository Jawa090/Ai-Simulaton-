/**
 * Where the backend lives.
 *
 * Local dev: leave VITE_API_URL unset — Vite proxies /api and /ws to
 * localhost:4000 (see vite.config.ts).
 * Production: set VITE_API_URL to the deployed backend origin, e.g.
 * https://avitronics-backend.onrender.com
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export function webSocketUrl(): string {
  if (API_BASE_URL) return `${API_BASE_URL.replace(/^http/, "ws")}/ws`;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws`;
}
