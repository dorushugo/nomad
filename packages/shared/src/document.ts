import { z } from "zod";

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE_LABEL = "10 Mo";

export const documentUploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z
    .number()
    .positive()
    .max(MAX_DOCUMENT_SIZE_BYTES, `Fichier trop volumineux (max ${MAX_DOCUMENT_SIZE_LABEL})`),
});
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

// Wire shape returned by the API. `fileUrl` is a signed URL on read paths
// and the raw storage path on internal records; consumers shouldn't care.
export interface Document {
  id: string;
  itemId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}
