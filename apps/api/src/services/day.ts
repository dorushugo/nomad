import type { DayUpdateInput, ItemCreateInput, ReorderItemsInput } from "@nomad/shared";
import { ForbiddenError } from "../errors";
import { dayRepo } from "../repositories/day";
import { itemRepo } from "../repositories/item";
import { prisma } from "../utils/prisma";
import { signDocuments, signItemDocuments } from "../utils/supabase";

export const dayService = {
  async addItem(dayId: string, userId: string, input: ItemCreateInput) {
    await dayRepo.requireForUser(dayId, userId);

    const data = { ...input };
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
    return { ...item, documents: await signDocuments(item.documents) };
  },

  async reorderItems(dayId: string, userId: string, input: ReorderItemsInput) {
    await dayRepo.requireForUser(dayId, userId);
    const ids = input.items.map((i) => i.id);
    const ownedCount = await itemRepo.countOwnedInDay(ids, dayId);
    if (ownedCount !== ids.length) {
      throw new ForbiddenError("Élément non autorisé");
    }
    await prisma.$transaction(
      input.items.map(({ id, order }) =>
        prisma.item.updateMany({ where: { id, dayId }, data: { order } })
      )
    );
    return { success: true as const };
  },

  async update(dayId: string, userId: string, input: DayUpdateInput) {
    await dayRepo.requireForUser(dayId, userId);
    const data = input.date ? { date: new Date(input.date) } : {};
    const updated = await prisma.day.update({
      where: { id: dayId },
      data,
      include: { items: { include: { documents: true }, orderBy: { order: "asc" } } },
    });
    return { ...updated, items: await signItemDocuments(updated.items) };
  },

  async delete(dayId: string, userId: string) {
    await dayRepo.requireOwnedByUser(dayId, userId);
    await prisma.day.delete({ where: { id: dayId } });
    return { success: true as const };
  },
};
