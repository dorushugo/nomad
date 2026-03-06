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
  dayId: string;
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
  addItem: (dayId: string, data: Omit<Item, "id" | "dayId" | "order">) => Promise<Item>;
  updateItem: (itemId: string, data: Partial<Item>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
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
          const trips = await api.get("/trips");
          set({ trips, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      fetchTrip: async (id) => {
        const trip = await api.get(`/trips/${id}`);
        set((state) => ({
          trips: state.trips.map((t) => (t.id === id ? trip : t)),
        }));
        return trip;
      },

      createTrip: async (data) => {
        const trip = await api.post("/trips", data);
        set((state) => ({ trips: [...state.trips, trip] }));
        return trip;
      },

      deleteTrip: async (id) => {
        await api.delete(`/trips/${id}`);
        set((state) => ({ trips: state.trips.filter((t) => t.id !== id) }));
      },

      addItem: async (dayId, data) => {
        const item = await api.post(`/days/${dayId}/items`, data);
        set((state) => ({
          trips: state.trips.map((trip) => ({
            ...trip,
            days: trip.days.map((day) =>
              day.id === dayId ? { ...day, items: [...day.items, item] } : day
            ),
          })),
        }));
        return item;
      },

      updateItem: async (itemId, data) => {
        const updated = await api.put(`/items/${itemId}`, data);
        set((state) => ({
          trips: state.trips.map((trip) => ({
            ...trip,
            days: trip.days.map((day) => ({
              ...day,
              items: day.items.map((item) =>
                item.id === itemId ? { ...item, ...updated } : item
              ),
            })),
          })),
        }));
      },

      deleteItem: async (itemId) => {
        await api.delete(`/items/${itemId}`);
        set((state) => ({
          trips: state.trips.map((trip) => ({
            ...trip,
            days: trip.days.map((day) => ({
              ...day,
              items: day.items.filter((item) => item.id !== itemId),
            })),
          })),
        }));
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
              items: day.items.map((item) =>
                item.id === itemId
                  ? { ...item, documents: [...(item.documents ?? []), document] }
                  : item
              ),
            })),
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
              items: day.items.map((item) => ({
                ...item,
                documents: (item.documents ?? []).filter((d) => d.id !== documentId),
              })),
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
