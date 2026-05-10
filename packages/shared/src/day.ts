import { z } from "zod";
import { dateStringSchema } from "./common";
import type { Item } from "./item";

// PUT /days/:id — only `date` is mutable from clients. Anything else
// (tripId, id) is owned by the server.
export const dayUpdateSchema = z.object({
  date: dateStringSchema.optional(),
});
export type DayUpdateInput = z.infer<typeof dayUpdateSchema>;

// PUT /days/:id/items/reorder — batch reorder items within a day.
export const reorderItemsSchema = z.object({
  items: z.array(z.object({ id: z.string(), order: z.number().int() })),
});
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;

// Wire shape.
export interface Day {
  id: string;
  date: string;
  tripId: string;
  items: Item[];
}
