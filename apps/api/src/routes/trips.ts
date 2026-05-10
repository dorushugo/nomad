import { Hono } from "hono";
import { ideaCreateSchema, tripCreateSchema, tripUpdateSchema } from "@nomad/shared";
import { ForbiddenError, NotFoundError } from "../errors";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { signDocuments, signItemDocuments, signTripDocuments } from "../utils/supabase";

export const tripsRouter = new Hono<AuthEnv>();
tripsRouter.use(authMiddleware);

// List user's trips
tripsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const trips = await prisma.trip.findMany({
    where: { users: { some: { userId } } },
    include: { days: { include: { items: { include: { documents: true } } } } },
    orderBy: { startDate: "asc" },
  });
  const signed = await Promise.all(trips.map(signTripDocuments));
  return c.json(signed);
});

// Get single trip
tripsRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const trip = await prisma.trip.findFirst({
    where: { id: c.req.param("id"), users: { some: { userId } } },
    include: {
      days: {
        include: { items: { include: { documents: true }, orderBy: { order: "asc" } } },
        orderBy: { date: "asc" },
      },
      users: { include: { user: { select: { id: true, name: true, email: true } } } },
      items: { where: { dayId: null }, include: { documents: true }, orderBy: { order: "asc" } },
    },
  });
  if (!trip) throw new NotFoundError("Voyage non trouvé");
  return c.json(await signTripDocuments(trip));
});

// Add unplanned idea to a trip
tripsRouter.post("/:id/items", async (c) => {
  const userId = c.get("userId");
  const tripId = c.req.param("id");
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, users: { some: { userId } } },
  });
  if (!trip) throw new NotFoundError("Voyage non trouvé");

  const data = ideaCreateSchema.parse(await c.req.json());

  if (data.order === undefined) {
    const lastIdea = await prisma.item.findFirst({
      where: { tripId, dayId: null },
      orderBy: { order: "desc" },
    });
    data.order = (lastIdea?.order ?? -1) + 1;
  }

  const item = await prisma.item.create({
    data: { ...data, tripId },
    include: { documents: true },
  });
  return c.json({ ...item, documents: await signDocuments(item.documents) }, 201);
});

// Create trip (auto-generates days)
tripsRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const parsed = tripCreateSchema.parse(await c.req.json());
  const startDate = new Date(parsed.startDate);
  const endDate = new Date(parsed.endDate);

  const days: { date: Date }[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push({ date: new Date(current) });
    current.setDate(current.getDate() + 1);
  }

  const trip = await prisma.trip.create({
    data: {
      ...parsed,
      startDate,
      endDate,
      users: { create: { userId, role: "owner" } },
      days: { create: days },
    },
    include: {
      days: {
        include: { items: { include: { documents: true }, orderBy: { order: "asc" } } },
        orderBy: { date: "asc" },
      },
    },
  });

  return c.json(await signTripDocuments(trip), 201);
});

// Update trip (owner only)
tripsRouter.put("/:id", async (c) => {
  const userId = c.get("userId");
  const tripId = c.req.param("id");
  const parsed = tripUpdateSchema.parse(await c.req.json());

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, users: { some: { userId, role: "owner" } } },
  });
  if (!trip) throw new ForbiddenError("Voyage non modifiable");

  const data = {
    ...parsed,
    ...(parsed.startDate ? { startDate: new Date(parsed.startDate) } : {}),
    ...(parsed.endDate ? { endDate: new Date(parsed.endDate) } : {}),
  };

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data,
    include: { days: { include: { items: { include: { documents: true } } } } },
  });
  return c.json(await signTripDocuments(updated));
});

// Delete trip (owner only)
tripsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const tripId = c.req.param("id");
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, users: { some: { userId, role: "owner" } } },
  });
  if (!trip) throw new ForbiddenError("Voyage non supprimable");

  await prisma.trip.delete({ where: { id: tripId } });
  return c.json({ success: true });
});

// Get days for a trip
tripsRouter.get("/:id/days", async (c) => {
  const userId = c.get("userId");
  const tripId = c.req.param("id");
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, users: { some: { userId } } },
  });
  if (!trip) throw new NotFoundError("Voyage non trouvé");

  const days = await prisma.day.findMany({
    where: { tripId },
    include: { items: { include: { documents: true }, orderBy: { order: "asc" } } },
    orderBy: { date: "asc" },
  });
  const signedDays = await Promise.all(
    days.map(async (day: (typeof days)[number]) => ({
      ...day,
      items: await signItemDocuments(day.items),
    }))
  );
  return c.json(signedDays);
});
