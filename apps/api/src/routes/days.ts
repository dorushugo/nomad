import { Hono } from "hono";
import { z } from "zod";
import { dayUpdateSchema, itemCreateSchema, reorderItemsSchema } from "@nomad/shared";
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

    const body = await c.req.json();
    const data = itemCreateSchema.parse(body);

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

// Batch reorder items in a day
daysRouter.put("/:id/items/reorder", async (c) => {
  try {
    const userId = c.get("userId");
    const dayId = c.req.param("id");
    const day = await prisma.day.findFirst({
      where: { id: dayId, trip: { users: { some: { userId } } } },
    });
    if (!day) return c.json({ error: "Jour non trouvé" }, 404);

    const { items } = reorderItemsSchema.parse(await c.req.json());

    const ids = items.map((i) => i.id);
    const ownedCount = await prisma.item.count({ where: { id: { in: ids }, dayId } });
    if (ownedCount !== ids.length) {
      return c.json({ error: "Élément non autorisé" }, 403);
    }

    await prisma.$transaction(
      items.map(({ id, order }) =>
        prisma.item.updateMany({ where: { id, dayId }, data: { order } })
      )
    );
    return c.json({ success: true });
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

    const parsed = dayUpdateSchema.parse(await c.req.json());
    const data = parsed.date ? { date: new Date(parsed.date) } : {};
    const updated = await prisma.day.update({
      where: { id: c.req.param("id") },
      data,
      include: { items: { include: { documents: true }, orderBy: { order: "asc" } } },
    });
    return c.json({ ...updated, items: await signItemDocuments(updated.items) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
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
