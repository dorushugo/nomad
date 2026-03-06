import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const DOCUMENTS_BUCKET = "documents";

const SIGNED_URL_EXPIRY = 3600; // 1 hour

/** Sign a single document's fileUrl (which stores the storage path) */
async function signDocument<T extends { fileUrl: string }>(doc: T): Promise<T> {
  const { data } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.fileUrl, SIGNED_URL_EXPIRY);
  return { ...doc, fileUrl: data?.signedUrl ?? doc.fileUrl };
}

/** Sign all documents in an array */
export async function signDocuments<T extends { fileUrl: string }>(docs: T[]): Promise<T[]> {
  if (!docs.length) return docs;
  const { data } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrls(docs.map((d) => d.fileUrl), SIGNED_URL_EXPIRY);
  if (!data) return docs;
  return docs.map((doc, i) => ({ ...doc, fileUrl: data[i]?.signedUrl ?? doc.fileUrl }));
}

/** Sign documents nested inside items → days structure */
export async function signItemDocuments(items: any[]): Promise<any[]> {
  const allDocs: { doc: any; itemIdx: number }[] = [];
  items.forEach((item, idx) => {
    (item.documents ?? []).forEach((doc: any) => allDocs.push({ doc, itemIdx: idx }));
  });
  if (!allDocs.length) return items;

  const paths = allDocs.map((d) => d.doc.fileUrl);
  const { data } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_EXPIRY);

  if (!data) return items;

  const result = items.map((item) => ({ ...item, documents: [...(item.documents ?? [])] }));
  allDocs.forEach(({ itemIdx }, i) => {
    const docIdx = allDocs.filter((d, j) => j < i && d.itemIdx === itemIdx).length;
    if (data[i]?.signedUrl) {
      result[itemIdx].documents[docIdx] = {
        ...result[itemIdx].documents[docIdx],
        fileUrl: data[i].signedUrl,
      };
    }
  });
  return result;
}

/** Sign documents for a full trip (days → items → documents) */
export async function signTripDocuments(trip: any): Promise<any> {
  const allDocs: { path: string; dayIdx: number; itemIdx: number; docIdx: number }[] = [];
  (trip.days ?? []).forEach((day: any, di: number) => {
    (day.items ?? []).forEach((item: any, ii: number) => {
      (item.documents ?? []).forEach((doc: any, doi: number) => {
        allDocs.push({ path: doc.fileUrl, dayIdx: di, itemIdx: ii, docIdx: doi });
      });
    });
  });
  if (!allDocs.length) return trip;

  const { data } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrls(allDocs.map((d) => d.path), SIGNED_URL_EXPIRY);

  if (!data) return trip;

  const result = {
    ...trip,
    days: trip.days.map((day: any) => ({
      ...day,
      items: day.items.map((item: any) => ({
        ...item,
        documents: [...(item.documents ?? [])],
      })),
    })),
  };

  allDocs.forEach(({ dayIdx, itemIdx, docIdx }, i) => {
    if (data[i]?.signedUrl) {
      result.days[dayIdx].items[itemIdx].documents[docIdx] = {
        ...result.days[dayIdx].items[itemIdx].documents[docIdx],
        fileUrl: data[i].signedUrl,
      };
    }
  });
  return result;
}
