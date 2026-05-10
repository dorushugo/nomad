import { ForbiddenError, NotFoundError } from "../errors";
import { prisma } from "../utils/prisma";

const TRIP_FULL_INCLUDE = {
  days: {
    include: { items: { include: { documents: true }, orderBy: { order: "asc" } as const } },
    orderBy: { date: "asc" } as const,
  },
  users: { include: { user: { select: { id: true, name: true, email: true } } } },
  items: {
    where: { dayId: null },
    include: { documents: true },
    orderBy: { order: "asc" } as const,
  },
};

export const tripRepo = {
  listForUser(userId: string) {
    return prisma.trip.findMany({
      where: { users: { some: { userId } } },
      include: { days: { include: { items: { include: { documents: true } } } } },
      orderBy: { startDate: "asc" },
    });
  },

  findByIdForUser(tripId: string, userId: string) {
    return prisma.trip.findFirst({
      where: { id: tripId, users: { some: { userId } } },
      include: TRIP_FULL_INCLUDE,
    });
  },

  // Throws NotFoundError if user can't access this trip in any role.
  async requireForUser(tripId: string, userId: string) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, users: { some: { userId } } },
    });
    if (!trip) throw new NotFoundError("Voyage non trouvé");
    return trip;
  },

  // Throws ForbiddenError if user is not the owner. Used for write/delete.
  async requireOwnedByUser(tripId: string, userId: string, action: "modifiable" | "supprimable") {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, users: { some: { userId, role: "owner" } } },
    });
    if (!trip) throw new ForbiddenError(`Voyage non ${action}`);
    return trip;
  },

  listDaysForTrip(tripId: string) {
    return prisma.day.findMany({
      where: { tripId },
      include: { items: { include: { documents: true }, orderBy: { order: "asc" } } },
      orderBy: { date: "asc" },
    });
  },
};
