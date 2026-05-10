import { z } from "zod";

// Validated at boot. process.env reads outside this file are forbidden;
// import { env } from "@/config/env" instead.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  BETTER_AUTH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Comma-separated origins, e.g. "nomad://,exp://,https://*.ngrok-free.app"
  // Parsed into an array; empty/unset means "permissive" in dev only.
  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform((s) =>
      s
        ? s
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : []
    ),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // biome-ignore lint/suspicious/noConsoleLog: boot-time crash, before logger exists
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
