import { Hono } from "hono";
import { dayUpdateSchema, itemCreateSchema, reorderItemsSchema } from "@nomad/shared";
import { ForbiddenError, NotFoundError } from "../errors";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { signDocuments, signItemDocuments } from "../utils/supabase";

export const daysRouter = new Hono<AuthEnv>();
daysRouter.use(authMiddleware);

// Add item to a day
daysRouter.post("/:id/items", async (c) => {
  const userId = c.get("userId");
  const dayId = c.req.param("id");
  const day = await prisma.day.findFirst({
    where: { id: dayId, trip: { users: { some: { userId } } } },
  });
  if (!day) throw new NotFoundError("Jour non trouvé");

  const data = itemCreateSchema.parse(await c.req.json());

  if (data.order === undefined) {
    const lastItem = await prisma.item.findFirst({
      where: { dayId },
      orderBy: { order: "desc" },
    });
    data.order = (lastItem?.order ?? -1) + 1;
  }

  const item = await prisma.item.create({
    data: { ...data, dayId },
    include: { documents: true },
  });
  return c.json({ ...item, documents: await signDocuments(item.documents) }, 201);
});

// Batch reorder items in a day
daysRouter.put("/:id/items/reorder", async (c) => {
  const userId = c.get("userId");
  const dayId = c.req.param("id");
  const day = await prisma.day.findFirst({
    where: { id: dayId, trip: { users: { some: { userId } } } },
  });
  if (!day) throw new NotFoundError("Jour non trouvé");

  const { items } = reorderItemsSchema.parse(await c.req.json());
  const ids = items.map((i) => i.id);
  const ownedCount = await prisma.item.count({ where: { id: { in: ids }, dayId } });
  if (ownedCount !== ids.length) {
    throw new ForbiddenError("Élément non autorisé");
  }

  await prisma.$transaction(
    items.map(({ id, order }) => prisma.item.updateMany({ where: { id, dayId }, data: { order } }))
  );
  return c.json({ success: true });
});

// Update a day (only `date` is mutable from clients)
daysRouter.put("/:id", async (c) => {
  const userId = c.get("userId");
  const dayId = c.req.param("id");
  const day = await prisma.day.findFirst({
    where: { id: dayId, trip: { users: { some: { userId } } } },
  });
  if (!day) throw new NotFoundError("Jour non trouvé");

  const parsed = dayUpdateSchema.parse(await c.req.json());
  const data = parsed.date ? { date: new Date(parsed.date) } : {};
  const updated = await prisma.day.update({
    where: { id: dayId },
    data,
    include: { items: { include: { documents: true }, orderBy: { order: "asc" } } },
  });
  return c.json({ ...updated, items: await signItemDocuments(updated.items) });
});

// Delete a day (owner only)
daysRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const dayId = c.req.param("id");
  const day = await prisma.day.findFirst({
    where: { id: dayId, trip: { users: { some: { userId, role: "owner" } } } },
  });
  if (!day) throw new ForbiddenError("Jour non supprimable");

  await prisma.day.delete({ where: { id: dayId } });
  return c.json({ success: true });
});
