import { NotFoundError } from "../errors";
import { prisma } from "../utils/prisma";

export const documentRepo = {
  async requireForUser(docId: string, userId: string) {
    const doc = await prisma.document.findFirst({
      where: {
        id: docId,
        item: { day: { trip: { users: { some: { userId } } } } },
      },
    });
    if (!doc) throw new NotFoundError("Document non trouvé");
    return doc;
  },
};
