type Level = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: Level;
  time: string;
  msg: string;
  [key: string]: unknown;
}

/**
 * Minimal structured logger. Emits one JSON object per line to stdout/stderr
 * so logs remain greppable/searchable without pulling in a logging framework
 * for a 3-day prototype.
 */
function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = { level, time: new Date().toISOString(), msg, ...meta };
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
};
