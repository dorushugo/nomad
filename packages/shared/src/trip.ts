import { z } from "zod";
import { dateStringSchema } from "./common";
import type { Day } from "./day";
import type { Item } from "./item";

export const tripCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  destination: z.string().min(1),
  emoji: z.string().optional(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
});
export type TripCreateInput = z.infer<typeof tripCreateSchema>;

// PUT /trips/:id — every field optional.
export const tripUpdateSchema = tripCreateSchema.partial();
export type TripUpdateInput = z.infer<typeof tripUpdateSchema>;

// Wire shape returned by the API.
export interface Trip {
  id: string;
  title: string;
  description?: string;
  destination: string;
  emoji?: string;
  startDate: string;
  endDate: string;
  days: Day[];
  items: Item[];
}
