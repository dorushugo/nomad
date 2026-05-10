import type { IdeaCreateInput, ItemCreateInput, TripCreateInput } from "@nomad/shared";

// Local aliases so screen code can reference them without pulling
// @nomad/shared directly. Keeps the public store API readable.
export type ApiTripCreatePayload = TripCreateInput;
export type ApiItemCreatePayload = ItemCreateInput;
export type ApiIdeaCreatePayload = IdeaCreateInput;
