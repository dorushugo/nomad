import { pino } from "pino";
import { env } from "../config/env";

// Pretty in dev, JSON in prod. pino-pretty is opted-in via transport so
// production logs are still structured (one JSON object per line).
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        },
      }
    : {}),
});

export type Logger = typeof logger;
