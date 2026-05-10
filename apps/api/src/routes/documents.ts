import { Hono } from "hono";
import { documentUploadSchema } from "@nomad/shared";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { documentService } from "../services/document";

export const documentsRouter = new Hono<AuthEnv>();
documentsRouter.use(authMiddleware);

documentsRouter.post("/items/:itemId/documents/upload-url", async (c) => {
  const data = documentUploadSchema.parse(await c.req.json());
  return c.json(
    await documentService.createUploadUrl(c.req.param("itemId"), c.get("userId"), data),
    201
  );
});

documentsRouter.delete("/documents/:id", async (c) =>
  c.json(await documentService.delete(c.req.param("id"), c.get("userId")))
);
