import { Hono } from "hono";
import { itemUpdateSchema } from "@nomad/shared";
import { NotFoundError } from "../errors";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { signDocuments } from "../utils/supabase";

export const itemsRouter = new Hono<AuthEnv>();
itemsRouter.use(authMiddleware);

// Items can live under a day OR directly under a trip (unplanned ideas);
// auth check spans both parents.
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
  const userId = c.get("userId");
  const itemId = c.req.param("id");
  const item = await findItemForUser(itemId, userId);
  if (!item) throw new NotFoundError("Élément non trouvé");

  const data = itemUpdateSchema.parse(await c.req.json());

  // dayId transitions: assigning to a day clears tripId; removing from a
  // day restores tripId from the day's parent trip so the item becomes
  // an unplanned idea under that trip again.
  type ItemUpdateData = typeof data & { tripId?: string | null };
  const updateData: ItemUpdateData = { ...data };
  if (data.dayId !== undefined) {
    if (data.dayId !== null) {
      updateData.tripId = null;
    } else {
      const currentItem = await prisma.item.findUnique({
        where: { id: itemId },
        select: { day: { select: { tripId: true } } },
      });
      if (currentItem?.day?.tripId) {
        updateData.tripId = currentItem.day.tripId;
      }
    }
  }

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: updateData,
    include: { documents: true },
  });
  return c.json({ ...updated, documents: await signDocuments(updated.documents) });
});

// Delete item
itemsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("id");
  const item = await findItemForUser(itemId, userId);
  if (!item) throw new NotFoundError("Élément non trouvé");

  await prisma.item.delete({ where: { id: itemId } });
  return c.json({ success: true });
});
