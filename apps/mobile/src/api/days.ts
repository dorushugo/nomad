import type { Day, DayUpdateInput, Item, ItemCreateInput, ReorderItemsInput } from "@nomad/shared";
import { apiClient } from "./client";

export const daysApi = {
  addItem: (dayId: string, data: ItemCreateInput) =>
    apiClient.post<Item>(`/days/${dayId}/items`, data),
  reorderItems: (dayId: string, data: ReorderItemsInput) =>
    apiClient.put<{ success: true }>(`/days/${dayId}/items/reorder`, data),
  update: (id: string, data: DayUpdateInput) => apiClient.put<Day>(`/days/${id}`, data),
  delete: (id: string) => apiClient.delete<{ success: true }>(`/days/${id}`),
};
