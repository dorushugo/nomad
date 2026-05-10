import type { Document, DocumentUploadInput } from "@nomad/shared";
import { apiClient } from "./client";

export interface UploadUrlResponse {
  document: Document;
  uploadUrl: string;
}

export const documentsApi = {
  createUploadUrl: (itemId: string, data: DocumentUploadInput) =>
    apiClient.post<UploadUrlResponse>(`/items/${itemId}/documents/upload-url`, data),
  delete: (id: string) => apiClient.delete<{ success: true }>(`/documents/${id}`),

  // Direct PUT to a Supabase signed URL — bypass apiClient since this
  // hits storage, not the API, and the body is the raw file blob.
  uploadFile: async (uploadUrl: string, file: { uri: string; type: string }) => {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: blob,
    });
  },
};
