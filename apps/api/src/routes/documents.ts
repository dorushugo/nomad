import path from "node:path";
import { Hono } from "hono";
import { documentUploadSchema } from "@nomad/shared";
import { BadRequestError, NotFoundError } from "../errors";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { DOCUMENTS_BUCKET, signDocuments, supabase } from "../utils/supabase";

export const documentsRouter = new Hono<AuthEnv>();
documentsRouter.use(authMiddleware);

// Strip path traversal and unsafe characters; preserve extension and readable name.
function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^A-Za-z0-9._-]/g, "_");
  return base.length > 0 ? base : "file";
}

// Get signed upload URL + create document record
documentsRouter.post("/items/:itemId/documents/upload-url", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      day: { trip: { users: { some: { userId } } } },
    },
  });
  if (!item) throw new NotFoundError("Élément non trouvé");

  const { fileName, fileType, fileSize } = documentUploadSchema.parse(await c.req.json());

  const safeFileName = sanitizeFileName(fileName);
  const storagePath = `${item.dayId}/${item.id}/${Date.now()}_${safeFileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (uploadError) throw new BadRequestError(uploadError.message);

  // Store the storage path (not a public URL)
  const document = await prisma.document.create({
    data: {
      itemId: item.id,
      fileName,
      fileUrl: storagePath,
      fileType,
      fileSize,
    },
  });

  // Return signed download URL for immediate display
  const [signed] = await signDocuments([document]);

  return c.json({ document: signed, uploadUrl: uploadData.signedUrl }, 201);
});

// Delete a document
documentsRouter.delete("/documents/:id", async (c) => {
  const userId = c.get("userId");
  const docId = c.req.param("id");
  const doc = await prisma.document.findFirst({
    where: {
      id: docId,
      item: { day: { trip: { users: { some: { userId } } } } },
    },
  });
  if (!doc) throw new NotFoundError("Document non trouvé");

  // fileUrl stores the storage path directly
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.fileUrl]);

  await prisma.document.delete({ where: { id: doc.id } });
  return c.json({ success: true });
});
