import { createClient } from "@supabase/supabase-js";
import type { Document, Item, Trip } from "@nomad/shared";
import { env } from "../config/env";

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export const DOCUMENTS_BUCKET = "documents";

const SIGNED_URL_EXPIRY = 3600; // 1 hour

// Anything with a fileUrl that points at a Supabase storage path. We
// keep the generic so signing returns the same concrete shape callers
// pass in (Prisma row, Document DTO, etc.).
type Signable = { fileUrl: string };

// Items are mostly Prisma's generated shape, but signing tolerates the
// looser wire shape too — both have `documents` as an optional array.
type ItemWithDocuments = Pick<Item, "id"> & { documents?: Signable[] };
type TripWithDayItemsAndIdeas = Pick<Trip, "id"> & {
  days?: { items?: ItemWithDocuments[] }[];
  items?: ItemWithDocuments[];
};

/** Sign all documents in an array (batched). */
export async function signDocuments<T extends Signable>(docs: T[]): Promise<T[]> {
  if (!docs.length) return docs;
  const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrls(
    docs.map((d) => d.fileUrl),
    SIGNED_URL_EXPIRY
  );
  if (!data) return docs;
  return docs.map((doc, i) => ({ ...doc, fileUrl: data[i]?.signedUrl ?? doc.fileUrl }));
}

/** Sign documents nested inside an items[] (single batched Supabase call). */
export async function signItemDocuments<T extends ItemWithDocuments>(items: T[]): Promise<T[]> {
  type IndexedDoc = { itemIdx: number; docIdx: number; path: string };
  const refs: IndexedDoc[] = [];
  items.forEach((item, itemIdx) => {
    (item.documents ?? []).forEach((doc, docIdx) => {
      refs.push({ itemIdx, docIdx, path: doc.fileUrl });
    });
  });
  if (!refs.length) return items;

  const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrls(
    refs.map((r) => r.path),
    SIGNED_URL_EXPIRY
  );
  if (!data) return items;

  // Clone documents arrays so we don't mutate input.
  const result = items.map((item) => ({
    ...item,
    documents: [...(item.documents ?? [])],
  }));

  refs.forEach((ref, i) => {
    const signedUrl = data[i]?.signedUrl;
    if (!signedUrl) return;
    const targetItem = result[ref.itemIdx];
    if (!targetItem.documents) return;
    targetItem.documents[ref.docIdx] = {
      ...targetItem.documents[ref.docIdx],
      fileUrl: signedUrl,
    };
  });
  return result;
}

/** Sign all documents under a trip (days → items → docs + idea-level items). */
export async function signTripDocuments<T extends TripWithDayItemsAndIdeas>(trip: T): Promise<T> {
  type DocRef =
    | { kind: "day"; dayIdx: number; itemIdx: number; docIdx: number; path: string }
    | { kind: "idea"; itemIdx: number; docIdx: number; path: string };

  const refs: DocRef[] = [];
  (trip.days ?? []).forEach((day, dayIdx) => {
    (day.items ?? []).forEach((item, itemIdx) => {
      (item.documents ?? []).forEach((doc, docIdx) => {
        refs.push({ kind: "day", dayIdx, itemIdx, docIdx, path: doc.fileUrl });
      });
    });
  });
  (trip.items ?? []).forEach((item, itemIdx) => {
    (item.documents ?? []).forEach((doc, docIdx) => {
      refs.push({ kind: "idea", itemIdx, docIdx, path: doc.fileUrl });
    });
  });

  if (!refs.length) return trip;

  const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrls(
    refs.map((r) => r.path),
    SIGNED_URL_EXPIRY
  );
  if (!data) return trip;

  // Deep-clone the slices we'll mutate so the input stays intact.
  const result: T = {
    ...trip,
    days: (trip.days ?? []).map((day) => ({
      ...day,
      items: (day.items ?? []).map((item) => ({
        ...item,
        documents: [...(item.documents ?? [])],
      })),
    })),
    items: (trip.items ?? []).map((item) => ({
      ...item,
      documents: [...(item.documents ?? [])],
    })),
  };

  refs.forEach((ref, i) => {
    const signedUrl = data[i]?.signedUrl;
    if (!signedUrl) return;
    if (ref.kind === "day") {
      const item = result.days?.[ref.dayIdx]?.items?.[ref.itemIdx];
      if (!item?.documents) return;
      item.documents[ref.docIdx] = {
        ...item.documents[ref.docIdx],
        fileUrl: signedUrl,
      } as Document;
    } else {
      const item = result.items?.[ref.itemIdx];
      if (!item?.documents) return;
      item.documents[ref.docIdx] = {
        ...item.documents[ref.docIdx],
        fileUrl: signedUrl,
      } as Document;
    }
  });
  return result;
}
