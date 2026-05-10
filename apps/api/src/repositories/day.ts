import { ForbiddenError, NotFoundError } from "../errors";
import { prisma } from "../utils/prisma";

export const dayRepo = {
  async requireForUser(dayId: string, userId: string) {
    const day = await prisma.day.findFirst({
      where: { id: dayId, trip: { users: { some: { userId } } } },
    });
    if (!day) throw new NotFoundError("Jour non trouvé");
    return day;
  },

  async requireOwnedByUser(dayId: string, userId: string) {
    const day = await prisma.day.findFirst({
      where: { id: dayId, trip: { users: { some: { userId, role: "owner" } } } },
    });
    if (!day) throw new ForbiddenError("Jour non supprimable");
    return day;
  },
};
