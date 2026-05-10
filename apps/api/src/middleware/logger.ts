import type { Context, Next } from "hono";
import { logger } from "../lib/logger";

// Logs one line per request with method/path/status/duration. Uses the
// pino logger (structured JSON in prod, pretty in dev).
export async function loggerMiddleware(c: Context, next: Next) {
  const start = performance.now();
  await next();
  const ms = Math.round(performance.now() - start);
  logger.info(
    { method: c.req.method, path: c.req.path, status: c.res.status, ms },
    `${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`
  );
}
