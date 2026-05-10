import { Hono } from "hono";
import { z } from "zod";
import { itemUpdateSchema } from "@nomad/shared";
import { prisma } from "../utils/prisma";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { signDocuments } from "../utils/supabase";

export const itemsRouter = new Hono<AuthEnv>();
itemsRouter.use(authMiddleware);

async function findItemForUser(itemId: string, userId: string) {
  return prisma.item.findFirst({
    where: {
      id: itemId,
      OR: [
        { day: { trip: { users: { some: { userId } } } } },
        { trip: { users: { some: { userId } } } },
      ],
    },
  });
}

// Update item
itemsRouter.put("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const item = await findItemForUser(c.req.param("id"), userId);
    if (!item) {
      return c.json({ error: "Element non trouve" }, 404);
    }

    const body = await c.req.json();
    const data = itemUpdateSchema.parse(body);

    const updateData: any = { ...data };
    if (data.dayId !== undefined) {
      if (data.dayId !== null) {
        // Assigning to a day → clear tripId
        updateData.tripId = null;
      } else {
        // Removing day → restore tripId from the item's current day
        const currentItem = await prisma.item.findUnique({
          where: { id: c.req.param("id") },
          select: { day: { select: { tripId: true } } },
        });
        if (currentItem?.day?.tripId) {
          updateData.tripId = currentItem.day.tripId;
        }
      }
    }

    const updated = await prisma.item.update({
      where: { id: c.req.param("id") },
      data: updateData,
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
    const item = await findItemForUser(c.req.param("id"), userId);
    if (!item) {
      return c.json({ error: "Element non trouve" }, 404);
    }

    await prisma.item.delete({ where: { id: c.req.param("id") } });
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Erreur serveur" }, 500);
  }
});
