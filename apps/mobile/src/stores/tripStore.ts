import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../utils/api";

export interface Document {
  id: string;
  itemId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export interface Item {
  id: string;
  type: "activity" | "accommodation" | "transport" | "note";
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  arrivalLocation?: string;
  transportMode?: string;
  price?: number;
  notes?: string;
  link?: string;
  order: number;
  dayId?: string;
  tripId?: string;
  documents?: Document[];
}

export interface Day {
  id: string;
  date: string;
  tripId: string;
  items: Item[];
}

export interface Trip {
  id: string;
  title: string;
  description?: string;
  destination: string;
  emoji?: string;
  startDate: string;
  endDate: string;
  days: Day[];
  items: Item[]; // Idées non planifiées
}

type RawDay = Omit<Day, "items"> & { items?: Item[] };
type RawTrip = Omit<Trip, "days" | "items"> & { days?: RawDay[]; items?: Item[] };

function normalizeItem(item: Item): Item {
  return {
    ...item,
    documents: item.documents ?? [],
  };
}

function normalizeDay(day: RawDay): Day {
  return {
    ...day,
    items: (day.items ?? []).map(normalizeItem),
  };
}

function normalizeTrip(trip: RawTrip): Trip {
  return {
    ...trip,
    days: (trip.days ?? []).map(normalizeDay),
    items: (trip.items ?? []).map(normalizeItem),
  };
}

interface TripState {
  trips: Trip[];
  isLoading: boolean;
  fetchTrips: () => Promise<void>;
  fetchTrip: (id: string) => Promise<Trip>;
  createTrip: (data: {
    title: string;
    description?: string;
    destination: string;
    emoji?: string;
    startDate: string;
    endDate: string;
  }) => Promise<Trip>;
  deleteTrip: (id: string) => Promise<void>;
  addItem: (dayId: string, data: Omit<Item, "id" | "dayId" | "tripId" | "order">) => Promise<Item>;
  addTripIdea: (tripId: string, data: Omit<Item, "id" | "dayId" | "tripId" | "order">) => Promise<Item>;
  updateItem: (itemId: string, data: Partial<Item>) => Promise<void>;
  assignIdeaToDay: (itemId: string, dayId: string, tripId: string) => Promise<void>;
  changeItemDay: (itemId: string, newDayId: string | null, tripId: string) => Promise<void>;
  deleteItem: (itemId: string, tripId?: string) => Promise<void>;
  reorderItems: (dayId: string, orderedItems: { id: string; order: number }[]) => Promise<void>;
  uploadDocument: (itemId: string, file: { uri: string; name: string; type: string; size: number }) => Promise<Document>;
  deleteDocument: (documentId: string) => Promise<void>;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      isLoading: false,

      fetchTrips: async () => {
        set({ isLoading: true });
        try {
          const trips = (await api.get("/trips")).map(normalizeTrip);
          set({ trips, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      fetchTrip: async (id) => {
        const trip = normalizeTrip(await api.get(`/trips/${id}`));
        set((state) => ({
          trips: state.trips.some((t) => t.id === id)
            ? state.trips.map((t) => (t.id === id ? trip : t))
            : [...state.trips, trip],
        }));
        return trip;
      },

      createTrip: async (data) => {
        const trip = normalizeTrip(await api.post("/trips", data));
        set((state) => ({ trips: [...state.trips, trip] }));
        return trip;
      },

      deleteTrip: async (id) => {
        await api.delete(`/trips/${id}`);
        set((state) => ({ trips: state.trips.filter((t) => t.id !== id) }));
      },

      addItem: async (dayId, data) => {
        const item = normalizeItem(await api.post(`/days/${dayId}/items`, data));
        set((state) => ({
          trips: state.trips.map((trip) => ({
            ...trip,
            days: trip.days.map((day) =>
              day.id === dayId ? { ...day, items: [...(day.items ?? []), item] } : day
            ),
          })),
        }));
        return item;
      },

      addTripIdea: async (tripId, data) => {
        const item = normalizeItem(await api.post(`/trips/${tripId}/items`, data));
        set((state) => ({
          trips: state.trips.map((trip) =>
            trip.id === tripId
              ? { ...trip, items: [...(trip.items ?? []), item] }
              : trip
          ),
        }));
        return item;
      },

      updateItem: async (itemId, data) => {
        const updated = normalizeItem(await api.put(`/items/${itemId}`, data));
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
      },

      assignIdeaToDay: async (itemId, dayId, tripId) => {
        const updated = normalizeItem(await api.put(`/items/${itemId}`, { dayId }));
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
      },

      changeItemDay: async (itemId, newDayId, tripId) => {
        const updated = normalizeItem(await api.put(`/items/${itemId}`, { dayId: newDayId }));
        set((state) => ({
          trips: state.trips.map((trip) => {
            if (trip.id !== tripId) return trip;
            // Remove item from its current location
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
            } else {
              return {
                ...trip,
                days: clearedDays,
                items: [...clearedIdeas, { ...updated, dayId: undefined, tripId }],
              };
            }
          }),
        }));
      },

      deleteItem: async (itemId, tripId) => {
        await api.delete(`/items/${itemId}`);
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
      },

      reorderItems: async (dayId, orderedItems) => {
        const orderMap = new Map(orderedItems.map(({ id, order }) => [id, order]));
        set((state) => ({
          trips: state.trips.map((trip) => ({
            ...trip,
            days: trip.days.map((day) => {
              if (day.id !== dayId) return day;
              return {
                ...day,
                items: day.items.map((item) =>
                  orderMap.has(item.id) ? { ...item, order: orderMap.get(item.id)! } : item
                ),
              };
            }),
          })),
        }));
        try {
          await api.put(`/days/${dayId}/items/reorder`, { items: orderedItems });
        } catch {
          const trip = get().trips.find((t) => t.days.some((d) => d.id === dayId));
          if (trip) await get().fetchTrip(trip.id);
        }
      },

      uploadDocument: async (itemId, file) => {
        const { document, uploadUrl } = await api.post(
          `/items/${itemId}/documents/upload-url`,
          { fileName: file.name, fileType: file.type, fileSize: file.size }
        );

        const response = await fetch(file.uri);
        const blob = await response.blob();
        await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: blob,
        });

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
      },

      deleteDocument: async (documentId) => {
        await api.delete(`/documents/${documentId}`);
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
      },
    }),
    {
      name: "trip-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ trips: state.trips }),
    }
  )
);
