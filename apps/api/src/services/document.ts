import path from "node:path";
import type { DocumentUploadInput } from "@nomad/shared";
import { BadRequestError } from "../errors";
import { documentRepo } from "../repositories/document";
import { itemRepo } from "../repositories/item";
import { prisma } from "../utils/prisma";
import { DOCUMENTS_BUCKET, signDocuments, supabase } from "../utils/supabase";

// Strip path traversal and unsafe characters; preserve extension and
// readable name. Anything not in [A-Za-z0-9._-] becomes "_".
function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^A-Za-z0-9._-]/g, "_");
  return base.length > 0 ? base : "file";
}

export const documentService = {
  async createUploadUrl(itemId: string, userId: string, input: DocumentUploadInput) {
    const item = await itemRepo.requireForUser(itemId, userId);

    const safeFileName = sanitizeFileName(input.fileName);
    const storagePath = `${item.dayId}/${item.id}/${Date.now()}_${safeFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (uploadError) throw new BadRequestError(uploadError.message);

    // fileUrl stores the storage path, not a public URL.
    const document = await prisma.document.create({
      data: {
        itemId: item.id,
        fileName: input.fileName,
        fileUrl: storagePath,
        fileType: input.fileType,
        fileSize: input.fileSize,
      },
    });

    const [signed] = await signDocuments([document]);
    return { document: signed, uploadUrl: uploadData.signedUrl };
  },

  async delete(docId: string, userId: string) {
    const doc = await documentRepo.requireForUser(docId, userId);
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.fileUrl]);
    await prisma.document.delete({ where: { id: doc.id } });
    return { success: true as const };
  },
};

// Exported for testing.
export { sanitizeFileName };
