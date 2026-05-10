import type { IdeaCreateInput, Item, Trip, TripCreateInput, TripUpdateInput } from "@nomad/shared";
import { apiClient } from "./client";

export const tripsApi = {
  list: () => apiClient.get<Trip[]>("/trips"),
  get: (id: string) => apiClient.get<Trip>(`/trips/${id}`),
  create: (data: TripCreateInput) => apiClient.post<Trip>("/trips", data),
  update: (id: string, data: TripUpdateInput) => apiClient.put<Trip>(`/trips/${id}`, data),
  delete: (id: string) => apiClient.delete<{ success: true }>(`/trips/${id}`),
  addIdea: (tripId: string, data: IdeaCreateInput) =>
    apiClient.post<Item>(`/trips/${tripId}/items`, data),
};
