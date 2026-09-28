import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../logging/logger";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.flatten() });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  logger.error("Unhandled API error", { error: err instanceof Error ? err.message : String(err), path: req.path });
  return res.status(500).json({ error: "Internal server error" });
}

export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
