import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Day, Document, Item, Trip } from "@nomad/shared";
import { ApiError, daysApi, documentsApi, itemsApi, tripsApi } from "../api";
import type {
  ApiTripCreatePayload,
  ApiItemCreatePayload,
  ApiIdeaCreatePayload,
} from "./tripStore.types";

export type { Day, Document, Item, Trip };

// Wire shape may omit optional arrays; normalize so consumers can rely on
// `documents`/`items` being present.
type RawDay = Omit<Day, "items"> & { items?: Item[] };
type RawTrip = Omit<Trip, "days" | "items"> & { days?: RawDay[]; items?: Item[] };

function normalizeItem(item: Item): Item {
  return { ...item, documents: item.documents ?? [] };
}

function normalizeDay(day: RawDay): Day {
  return { ...day, items: (day.items ?? []).map(normalizeItem) };
}

function normalizeTrip(trip: RawTrip): Trip {
  return {
    ...trip,
    days: (trip.days ?? []).map(normalizeDay),
    items: (trip.items ?? []).map(normalizeItem),
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Erreur inconnue";
}

interface TripState {
  trips: Trip[];
  isLoading: boolean;
  error: string | null;

  clearError: () => void;
  fetchTrips: () => Promise<void>;
  fetchTrip: (id: string) => Promise<Trip>;
  createTrip: (data: ApiTripCreatePayload) => Promise<Trip>;
  deleteTrip: (id: string) => Promise<void>;
  addItem: (dayId: string, data: ApiItemCreatePayload) => Promise<Item>;
  addTripIdea: (tripId: string, data: ApiIdeaCreatePayload) => Promise<Item>;
  updateItem: (itemId: string, data: Partial<Item>) => Promise<void>;
  assignIdeaToDay: (itemId: string, dayId: string, tripId: string) => Promise<void>;
  changeItemDay: (itemId: string, newDayId: string | null, tripId: string) => Promise<void>;
  deleteItem: (itemId: string, tripId?: string) => Promise<void>;
  reorderItems: (dayId: string, orderedItems: { id: string; order: number }[]) => Promise<void>;
  uploadDocument: (
    itemId: string,
    file: { uri: string; name: string; type: string; size: number }
  ) => Promise<Document>;
  deleteDocument: (documentId: string) => Promise<void>;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      isLoading: false,
      error: null,

      clearError: () => set({ error: null }),

      fetchTrips: async () => {
        set({ isLoading: true, error: null });
        try {
          const trips = (await tripsApi.list()).map(normalizeTrip);
          set({ trips, isLoading: false });
        } catch (err) {
          set({ isLoading: false, error: errorMessage(err) });
        }
      },

      fetchTrip: async (id) => {
        try {
          const trip = normalizeTrip(await tripsApi.get(id));
          set((state) => ({
            trips: state.trips.some((t) => t.id === id)
              ? state.trips.map((t) => (t.id === id ? trip : t))
              : [...state.trips, trip],
          }));
          return trip;
        } catch (err) {
          set({ error: errorMessage(err) });
          throw err;
        }
      },

      createTrip: async (data) => {
        try {
          const trip = normalizeTrip(await tripsApi.create(data));
          set((state) => ({ trips: [...state.trips, trip] }));
          return trip;
        } catch (err) {
          set({ error: errorMessage(err) });
          throw err;
        }
      },

      deleteTrip: async (id) => {
        const previous = get().trips;
        set((state) => ({ trips: state.trips.filter((t) => t.id !== id) }));
        try {
          await tripsApi.delete(id);
        } catch (err) {
          set({ trips: previous, error: errorMessage(err) });
          throw err;
        }
      },

      addItem: async (dayId, data) => {
        try {
          const item = normalizeItem(await daysApi.addItem(dayId, data));
          set((state) => ({
            trips: state.trips.map((trip) => ({
              ...trip,
              days: trip.days.map((day) =>
                day.id === dayId ? { ...day, items: [...(day.items ?? []), item] } : day
              ),
            })),
          }));
          return item;
        } catch (err) {
          set({ error: errorMessage(err) });
          throw err;
        }
      },

      addTripIdea: async (tripId, data) => {
        try {
          const item = normalizeItem(await tripsApi.addIdea(tripId, data));
          set((state) => ({
            trips: state.trips.map((trip) =>
              trip.id === tripId ? { ...trip, items: [...(trip.items ?? []), item] } : trip
            ),
          }));
          return item;
        } catch (err) {
          set({ error: errorMessage(err) });
          throw err;
        }
      },

      updateItem: async (itemId, data) => {
        const previous = get().trips;
        try {
          const updated = normalizeItem(await itemsApi.update(itemId, data));
          set((state) => ({
            trips: state.trips.map((trip) => ({
              ...trip,
              days: trip.days.map((day) => ({
                ...day,
                items: (day.items ?? []).map((item) =>
                  item.id === itemId ? { ...item, ...updated } : item
                ),
              })),
              items: (trip.items ?? []).map((item) =>
                item.id === itemId ? { ...item, ...updated } : item
              ),
            })),
          }));
        } catch (err) {
          set({ trips: previous, error: errorMessage(err) });
          throw err;
        }
      },

      assignIdeaToDay: async (itemId, dayId, tripId) => {
        const previous = get().trips;
        try {
          const updated = normalizeItem(await itemsApi.update(itemId, { dayId }));
          set((state) => ({
            trips: state.trips.map((trip) => {
              if (trip.id !== tripId) return trip;
              return {
                ...trip,
                items: (trip.items ?? []).filter((i) => i.id !== itemId),
                days: trip.days.map((day) =>
                  day.id === dayId
                    ? { ...day, items: [...(day.items ?? []), { ...updated, dayId }] }
                    : day
                ),
              };
            }),
          }));
        } catch (err) {
          set({ trips: previous, error: errorMessage(err) });
          throw err;
        }
      },

      changeItemDay: async (itemId, newDayId, tripId) => {
        const previous = get().trips;
        try {
          const updated = normalizeItem(await itemsApi.update(itemId, { dayId: newDayId }));
          set((state) => ({
            trips: state.trips.map((trip) => {
              if (trip.id !== tripId) return trip;
              const clearedDays = trip.days.map((day) => ({
                ...day,
                items: (day.items ?? []).filter((i) => i.id !== itemId),
              }));
              const clearedIdeas = (trip.items ?? []).filter((i) => i.id !== itemId);
              if (newDayId) {
                return {
                  ...trip,
                  days: clearedDays.map((day) =>
                    day.id === newDayId
                      ? { ...day, items: [...day.items, { ...updated, dayId: newDayId }] }
                      : day
                  ),
                  items: clearedIdeas,
                };
              }
              return {
                ...trip,
                days: clearedDays,
                items: [...clearedIdeas, { ...updated, dayId: undefined, tripId }],
              };
            }),
          }));
        } catch (err) {
          set({ trips: previous, error: errorMessage(err) });
          throw err;
        }
      },

      deleteItem: async (itemId, _tripId) => {
        const previous = get().trips;
        set((state) => ({
          trips: state.trips.map((trip) => ({
            ...trip,
            days: trip.days.map((day) => ({
              ...day,
              items: (day.items ?? []).filter((item) => item.id !== itemId),
            })),
            items: (trip.items ?? []).filter((item) => item.id !== itemId),
          })),
        }));
        try {
          await itemsApi.delete(itemId);
        } catch (err) {
          set({ trips: previous, error: errorMessage(err) });
          throw err;
        }
      },

      reorderItems: async (dayId, orderedItems) => {
        const previous = get().trips;
        const orderMap = new Map(orderedItems.map(({ id, order }) => [id, order]));
        set((state) => ({
          trips: state.trips.map((trip) => ({
            ...trip,
            days: trip.days.map((day) => {
              if (day.id !== dayId) return day;
              return {
                ...day,
                items: day.items.map((item) =>
                  orderMap.has(item.id)
                    ? { ...item, order: orderMap.get(item.id) ?? item.order }
                    : item
                ),
              };
            }),
          })),
        }));
        try {
          await daysApi.reorderItems(dayId, { items: orderedItems });
        } catch (err) {
          set({ trips: previous, error: errorMessage(err) });
        }
      },

      uploadDocument: async (itemId, file) => {
        try {
          const { document, uploadUrl } = await documentsApi.createUploadUrl(itemId, {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          });
          await documentsApi.uploadFile(uploadUrl, file);

          set((state) => ({
            trips: state.trips.map((trip) => ({
              ...trip,
              days: trip.days.map((day) => ({
                ...day,
                items: (day.items ?? []).map((item) =>
                  item.id === itemId
                    ? { ...item, documents: [...(item.documents ?? []), document] }
                    : item
                ),
              })),
              items: (trip.items ?? []).map((item) =>
                item.id === itemId
                  ? { ...item, documents: [...(item.documents ?? []), document] }
                  : item
              ),
            })),
          }));
          return document;
        } catch (err) {
          set({ error: errorMessage(err) });
          throw err;
        }
      },

      deleteDocument: async (documentId) => {
        const previous = get().trips;
        set((state) => ({
          trips: state.trips.map((trip) => ({
            ...trip,
            days: trip.days.map((day) => ({
              ...day,
              items: (day.items ?? []).map((item) => ({
                ...item,
                documents: (item.documents ?? []).filter((d) => d.id !== documentId),
              })),
            })),
            items: (trip.items ?? []).map((item) => ({
              ...item,
              documents: (item.documents ?? []).filter((d) => d.id !== documentId),
            })),
          })),
        }));
        try {
          await documentsApi.delete(documentId);
        } catch (err) {
          set({ trips: previous, error: errorMessage(err) });
          throw err;
        }
      },
    }),
    {
      name: "trip-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ trips: state.trips }),
    }
  )
);
