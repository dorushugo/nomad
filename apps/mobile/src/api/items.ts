import type { Item, ItemUpdateInput } from "@nomad/shared";
import { apiClient } from "./client";

export const itemsApi = {
  update: (id: string, data: ItemUpdateInput) => apiClient.put<Item>(`/items/${id}`, data),
  delete: (id: string) => apiClient.delete<{ success: true }>(`/items/${id}`),
};
