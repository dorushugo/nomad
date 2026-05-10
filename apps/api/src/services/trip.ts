import type { IdeaCreateInput, TripCreateInput, TripUpdateInput } from "@nomad/shared";
import { NotFoundError } from "../errors";
import { tripRepo } from "../repositories/trip";
import { prisma } from "../utils/prisma";
import { signDocuments, signItemDocuments, signTripDocuments } from "../utils/supabase";

// Day generation: inclusive range from startDate to endDate, one Day per
// calendar day. Uses local-day ticks (setDate increments by 1) so DST
// transitions don't drop or duplicate days.
function buildInitialDays(startDate: Date, endDate: Date): { date: Date }[] {
  const days: { date: Date }[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push({ date: new Date(current) });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export const tripService = {
  async list(userId: string) {
    const trips = await tripRepo.listForUser(userId);
    return Promise.all(trips.map(signTripDocuments));
  },

  async get(tripId: string, userId: string) {
    const trip = await tripRepo.findByIdForUser(tripId, userId);
    if (!trip) throw new NotFoundError("Voyage non trouvé");
    return signTripDocuments(trip);
  },

  async create(userId: string, input: TripCreateInput) {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    const trip = await prisma.trip.create({
      data: {
        ...input,
        startDate,
        endDate,
        users: { create: { userId, role: "owner" } },
        days: { create: buildInitialDays(startDate, endDate) },
      },
      include: {
        days: {
          include: { items: { include: { documents: true }, orderBy: { order: "asc" } } },
          orderBy: { date: "asc" },
        },
      },
    });
    return signTripDocuments(trip);
  },

  async update(tripId: string, userId: string, input: TripUpdateInput) {
    await tripRepo.requireOwnedByUser(tripId, userId, "modifiable");
    const data = {
      ...input,
      ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
      ...(input.endDate ? { endDate: new Date(input.endDate) } : {}),
    };
    const updated = await prisma.trip.update({
      where: { id: tripId },
      data,
      include: { days: { include: { items: { include: { documents: true } } } } },
    });
    return signTripDocuments(updated);
  },

  async delete(tripId: string, userId: string) {
    await tripRepo.requireOwnedByUser(tripId, userId, "supprimable");
    await prisma.trip.delete({ where: { id: tripId } });
    return { success: true as const };
  },

  async addIdea(tripId: string, userId: string, input: IdeaCreateInput) {
    await tripRepo.requireForUser(tripId, userId);
    const data = { ...input };
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
    return { ...item, documents: await signDocuments(item.documents) };
  },

  async listDays(tripId: string, userId: string) {
    await tripRepo.requireForUser(tripId, userId);
    const days = await tripRepo.listDaysForTrip(tripId);
    return Promise.all(
      days.map(async (day) => ({ ...day, items: await signItemDocuments(day.items) }))
    );
  },
};
