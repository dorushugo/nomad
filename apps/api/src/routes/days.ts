import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { signDocuments, signItemDocuments } from "../utils/supabase";

export const daysRouter = new Hono<AuthEnv>();
daysRouter.use(authMiddleware);

// Add item to a day
daysRouter.post("/:id/items", async (c) => {
  try {
    const userId = c.get("userId");
    const day = await prisma.day.findFirst({
      where: { id: c.req.param("id"), trip: { users: { some: { userId } } } },
    });
    if (!day) {
      return c.json({ error: "Jour non trouve" }, 404);
    }

    const itemSchema = z.object({
      type: z.enum(["activity", "accommodation", "transport", "note"]),
      title: z.string().min(1),
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

    const body = await c.req.json();
    const data = itemSchema.parse(body);

    if (data.order === undefined) {
      const lastItem = await prisma.item.findFirst({
        where: { dayId: c.req.param("id") },
        orderBy: { order: "desc" },
      });
      data.order = (lastItem?.order ?? -1) + 1;
    }

    const item = await prisma.item.create({
      data: { ...data, dayId: c.req.param("id") },
      include: { documents: true },
    });
    return c.json({ ...item, documents: await signDocuments(item.documents) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// Update a day
daysRouter.put("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const day = await prisma.day.findFirst({
      where: { id: c.req.param("id"), trip: { users: { some: { userId } } } },
    });
    if (!day) {
      return c.json({ error: "Jour non trouve" }, 404);
    }

    const body = await c.req.json();
    const updated = await prisma.day.update({
      where: { id: c.req.param("id") },
      data: body,
      include: { items: { include: { documents: true }, orderBy: { order: "asc" } } },
    });
    return c.json({ ...updated, items: await signItemDocuments(updated.items) });
  } catch {
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// Delete a day
daysRouter.delete("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const day = await prisma.day.findFirst({
      where: { id: c.req.param("id"), trip: { users: { some: { userId, role: "owner" } } } },
    });
    if (!day) {
      return c.json({ error: "Jour non trouve" }, 404);
    }

    await prisma.day.delete({ where: { id: c.req.param("id") } });
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Erreur serveur" }, 500);
  }
});
