import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { signDocuments } from "../utils/supabase";

export const itemsRouter = new Hono<AuthEnv>();
itemsRouter.use(authMiddleware);

const updateItemSchema = z.object({
  type: z.enum(["activity", "accommodation", "transport", "note"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  arrivalLocation: z.string().optional(),
  transportMode: z.string().optional(),
  price: z.number().optional(),
  notes: z.string().optional(),
  link: z.string().optional(),
  order: z.number().optional(),
});

// Update item
itemsRouter.put("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const item = await prisma.item.findFirst({
      where: { id: c.req.param("id"), day: { trip: { users: { some: { userId } } } } },
    });
    if (!item) {
      return c.json({ error: "Element non trouve" }, 404);
    }

    const body = await c.req.json();
    const data = updateItemSchema.parse(body);
    const updated = await prisma.item.update({
      where: { id: c.req.param("id") },
      data,
      include: { documents: true },
    });
    return c.json({ ...updated, documents: await signDocuments(updated.documents) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// Delete item
itemsRouter.delete("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const item = await prisma.item.findFirst({
      where: { id: c.req.param("id"), day: { trip: { users: { some: { userId } } } } },
    });
    if (!item) {
      return c.json({ error: "Element non trouve" }, 404);
    }

    await prisma.item.delete({ where: { id: c.req.param("id") } });
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Erreur serveur" }, 500);
  }
});
