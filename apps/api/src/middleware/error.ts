import type { Context } from "hono";
import { ZodError } from "zod";
import { AppError } from "../errors";
import { logger } from "../lib/logger";

// Central error handler — registered with app.onError. Routes and services
// throw AppError subclasses or zod errors; this layer maps them to a
// consistent JSON shape with `error` as a human message and `code`/`details`
// alongside. Keeping `error` as a string preserves the old wire contract
// the mobile client reads via `error.error`.
export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      { error: err.message, code: err.code, details: err.details },
      // biome-ignore lint/suspicious/noExplicitAny: Hono's status union is verbose
      err.status as any
    );
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: "Données invalides",
        code: "VALIDATION",
        details: err.flatten().fieldErrors,
      },
      400
    );
  }

  logger.error({ err, path: c.req.path }, "unhandled error");
  return c.json({ error: "Erreur serveur", code: "INTERNAL" }, 500);
}
