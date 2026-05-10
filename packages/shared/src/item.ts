import { z } from "zod";
import { timeStringSchema } from "./common";
import type { Document } from "./document";

export const itemTypeSchema = z.enum(["activity", "accommodation", "transport", "note"]);
export type ItemType = z.infer<typeof itemTypeSchema>;

export const transportModeSchema = z.enum([
  "avion",
  "train",
  "voiture",
  "bus",
  "metro",
  "velo",
  "a_pied",
  "autre",
]);
export type TransportMode = z.infer<typeof transportModeSchema>;

// Fields shared by both scheduled items (in a day) and unplanned ideas.
const baseItemFieldsSchema = z.object({
  type: itemTypeSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  arrivalLocation: z.string().optional(),
  transportMode: z.string().optional(),
  price: z.number().optional(),
  notes: z.string().optional(),
  link: z.string().optional(),
  order: z.number().optional(),
});

// POST /days/:id/items — adds a scheduled item to a day.
export const itemCreateSchema = baseItemFieldsSchema.extend({
  startTime: timeStringSchema.optional().or(z.literal("")),
  endTime: timeStringSchema.optional().or(z.literal("")),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;

// POST /trips/:id/items — adds an unplanned idea (no time of day).
export const ideaCreateSchema = baseItemFieldsSchema;
export type IdeaCreateInput = z.infer<typeof ideaCreateSchema>;

// PUT /items/:id — every field optional; dayId can move the item between
// a day and the trip-level idea pool (null = unschedule).
export const itemUpdateSchema = z.object({
  type: itemTypeSchema.optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  arrivalLocation: z.string().optional(),
  transportMode: z.string().optional(),
  price: z.number().optional(),
  notes: z.string().optional(),
  link: z.string().optional(),
  order: z.number().optional(),
  dayId: z.string().nullable().optional(),
});
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;

// Wire shape returned by the API.
export interface Item {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  arrivalLocation?: string;
  transportMode?: string;
  price?: number;
  notes?: string;
  link?: string;
  order: number;
  dayId?: string | null;
  tripId?: string | null;
  documents?: Document[];
}
