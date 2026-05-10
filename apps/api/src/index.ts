import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env";
import { auth } from "./lib/auth";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/error";
import { loggerMiddleware } from "./middleware/logger";
import { daysRouter } from "./routes/days";
import { documentsRouter } from "./routes/documents";
import { itemsRouter } from "./routes/items";
import { tripsRouter } from "./routes/trips";

export const app = new Hono();

// CORS: in dev, fall back to permissive when ALLOWED_ORIGINS is empty so
// expo/ngrok still work. In prod, an empty list rejects everything.
app.use(
  "*",
  cors(
    env.ALLOWED_ORIGINS.length > 0
      ? { origin: env.ALLOWED_ORIGINS }
      : env.NODE_ENV === "development"
        ? {}
        : { origin: [] }
  )
);

app.use("*", loggerMiddleware);
app.onError(errorHandler);

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.route("/trips", tripsRouter);
app.route("/days", daysRouter);
app.route("/items", itemsRouter);
app.route("/", documentsRouter);

app.get("/health", (c) => c.json({ status: "ok" }));

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

logger.info(
  { port: server.port, env: env.NODE_ENV },
  `Nomad API running on http://${server.hostname}:${server.port}`
);
