import type { ItemUpdateInput } from "@nomad/shared";
import { itemRepo } from "../repositories/item";
import { prisma } from "../utils/prisma";
import { signDocuments } from "../utils/supabase";

export const itemService = {
  async update(itemId: string, userId: string, input: ItemUpdateInput) {
    await itemRepo.requireForUser(itemId, userId);

    // dayId transitions: assigning to a day clears tripId; removing from a
    // day restores tripId from the day's parent trip so the item becomes
    // an unplanned idea under that trip again.
    type WriteData = ItemUpdateInput & { tripId?: string | null };
    const updateData: WriteData = { ...input };
    if (input.dayId !== undefined) {
      if (input.dayId !== null) {
        updateData.tripId = null;
      } else {
        const current = await prisma.item.findUnique({
          where: { id: itemId },
          select: { day: { select: { tripId: true } } },
        });
        if (current?.day?.tripId) {
          updateData.tripId = current.day.tripId;
        }
      }
    }

    const updated = await prisma.item.update({
      where: { id: itemId },
      data: updateData,
      include: { documents: true },
    });
    return { ...updated, documents: await signDocuments(updated.documents) };
  },

  async delete(itemId: string, userId: string) {
    await itemRepo.requireForUser(itemId, userId);
    await prisma.item.delete({ where: { id: itemId } });
    return { success: true as const };
  },
};
