import path from "node:path";
import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { supabase, DOCUMENTS_BUCKET, signDocuments } from "../utils/supabase";
import { authMiddleware, type AuthEnv } from "../middleware/auth";

export const documentsRouter = new Hono<AuthEnv>();
documentsRouter.use(authMiddleware);

// Strip path traversal and unsafe characters; preserve extension and readable name.
function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^A-Za-z0-9._-]/g, "_");
  return base.length > 0 ? base : "file";
}

// Get signed upload URL + create document record
documentsRouter.post("/items/:itemId/documents/upload-url", async (c) => {
  try {
    const userId = c.get("userId");
    const item = await prisma.item.findFirst({
      where: {
        id: c.req.param("itemId"),
        day: { trip: { users: { some: { userId } } } },
      },
    });
    if (!item) return c.json({ error: "Element non trouve" }, 404);

    const body = await c.req.json();
    const { fileName, fileType, fileSize } = z
      .object({
        fileName: z.string().min(1),
        fileType: z.string().min(1),
        fileSize: z.number().positive().max(10 * 1024 * 1024, "Fichier trop volumineux (max 10 Mo)"),
      })
      .parse(body);

    const safeFileName = sanitizeFileName(fileName);
    const storagePath = `${item.dayId}/${item.id}/${Date.now()}_${safeFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (uploadError) return c.json({ error: uploadError.message }, 500);

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// Delete a document
documentsRouter.delete("/documents/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const doc = await prisma.document.findFirst({
      where: {
        id: c.req.param("id"),
        item: { day: { trip: { users: { some: { userId } } } } },
      },
    });
    if (!doc) return c.json({ error: "Document non trouve" }, 404);

    // fileUrl stores the storage path directly
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.fileUrl]);

    await prisma.document.delete({ where: { id: doc.id } });
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Erreur serveur" }, 500);
  }
});
