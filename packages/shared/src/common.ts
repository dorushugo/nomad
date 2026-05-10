import { z } from "zod";

// HH:mm 24-hour time of day (e.g. "08:30", "23:45").
export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format heure invalide (HH:mm)");

// ISO date string accepted from clients; the API parses it to Date.
// Kept permissive (any string) to mirror the existing API behaviour:
// trips POST currently calls `new Date(s)` without strict format validation.
export const dateStringSchema = z.string();
