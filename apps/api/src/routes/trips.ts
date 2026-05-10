import { Hono } from "hono";
import { z } from "zod";
import { ideaCreateSchema, tripCreateSchema, tripUpdateSchema } from "@nomad/shared";
import { prisma } from "../utils/prisma";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { signTripDocuments } from "../utils/supabase";

export const tripsRouter = new Hono<AuthEnv>();
tripsRouter.use(authMiddleware);

// List user's trips
tripsRouter.get("/", async (c) => {
  try {
    const userId = c.get("userId");
    const trips = await prisma.trip.findMany({
      where: { users: { some: { userId } } },
      include: { days: { include: { items: { include: { documents: true } } } } },
      orderBy: { startDate: "asc" },
    });
    const signed = await Promise.all(trips.map(signTripDocuments));
    return c.json(signed);
  } catch {
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// Get single trip
tripsRouter.get("/:id", async (c) => {
  try {
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
    if (!trip) {
      return c.json({ error: "Voyage non trouve" }, 404);
    }
    return c.json(await signTripDocuments(trip));
  } catch {
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// Add unplanned idea to a trip
tripsRouter.post("/:id/items", async (c) => {
  try {
    const userId = c.get("userId");
    const trip = await prisma.trip.findFirst({
      where: { id: c.req.param("id"), users: { some: { userId } } },
    });
    if (!trip) {
      return c.json({ error: "Voyage non trouve" }, 404);
    }

    const body = await c.req.json();
    const data = ideaCreateSchema.parse(body);

    if (data.order === undefined) {
      const lastIdea = await prisma.item.findFirst({
        where: { tripId: c.req.param("id"), dayId: null },
        orderBy: { order: "desc" },
      });
      data.order = (lastIdea?.order ?? -1) + 1;
    }

    const { signDocuments } = await import("../utils/supabase");
    const item = await prisma.item.create({
      data: { ...data, tripId: c.req.param("id") },
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

// Create trip (auto-generates days)
tripsRouter.post("/", async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const parsed = tripCreateSchema.parse(body);
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    console.error("[POST /trips] Error:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// Update trip
tripsRouter.put("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const parsed = tripUpdateSchema.parse(body);

    const trip = await prisma.trip.findFirst({
      where: { id: c.req.param("id"), users: { some: { userId, role: "owner" } } },
    });
    if (!trip) {
      return c.json({ error: "Voyage non trouve" }, 404);
    }

    const data = {
      ...parsed,
      ...(parsed.startDate ? { startDate: new Date(parsed.startDate) } : {}),
      ...(parsed.endDate ? { endDate: new Date(parsed.endDate) } : {}),
    };

    const updated = await prisma.trip.update({
      where: { id: c.req.param("id") },
      data,
      include: { days: { include: { items: { include: { documents: true } } } } },
    });
    return c.json(await signTripDocuments(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// Delete trip
tripsRouter.delete("/:id", async (c) => {
  try {
    const userId = c.get("userId");
    const trip = await prisma.trip.findFirst({
      where: { id: c.req.param("id"), users: { some: { userId, role: "owner" } } },
    });
    if (!trip) {
      return c.json({ error: "Voyage non trouve" }, 404);
    }

    await prisma.trip.delete({ where: { id: c.req.param("id") } });
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// Get days for a trip
tripsRouter.get("/:id/days", async (c) => {
  try {
    const userId = c.get("userId");
    const trip = await prisma.trip.findFirst({
      where: { id: c.req.param("id"), users: { some: { userId } } },
    });
    if (!trip) {
      return c.json({ error: "Voyage non trouve" }, 404);
    }

    const days = await prisma.day.findMany({
      where: { tripId: c.req.param("id") },
      include: { items: { include: { documents: true }, orderBy: { order: "asc" } } },
      orderBy: { date: "asc" },
    });
    // Sign document URLs in each day's items
    const { signItemDocuments } = await import("../utils/supabase");
    const signedDays = await Promise.all(
      days.map(async (day: (typeof days)[number]) => ({
        ...day,
        items: await signItemDocuments(day.items),
      }))
    );
    return c.json(signedDays);
  } catch {
    return c.json({ error: "Erreur serveur" }, 500);
  }
});
