import { NotFoundError } from "../errors";
import { prisma } from "../utils/prisma";

// Items can live under a day OR directly under a trip (unplanned ideas);
// auth checks span both parents.
const ownedByUserClause = (userId: string) => ({
  OR: [
    { day: { trip: { users: { some: { userId } } } } },
    { trip: { users: { some: { userId } } } },
  ],
});

export const itemRepo = {
  findByIdForUser(itemId: string, userId: string) {
    return prisma.item.findFirst({
      where: { id: itemId, ...ownedByUserClause(userId) },
    });
  },

  async requireForUser(itemId: string, userId: string) {
    const item = await this.findByIdForUser(itemId, userId);
    if (!item) throw new NotFoundError("Élément non trouvé");
    return item;
  },

  countOwnedInDay(ids: string[], dayId: string) {
    return prisma.item.count({ where: { id: { in: ids }, dayId } });
  },
};
