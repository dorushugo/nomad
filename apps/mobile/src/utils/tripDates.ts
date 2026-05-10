import type { Trip } from "../stores/tripStore";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type TripTimingStatus = "past" | "current" | "future";

type DateInput = string | Date;

function parseDateOnly(dateInput: DateInput): Date {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }

  const ymdMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(dateInput);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return new Date(Number.NaN);
}

export function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getTripRange(trip: Pick<Trip, "startDate" | "endDate">) {
  return {
    start: parseDateOnly(trip.startDate).getTime(),
    end: parseDateOnly(trip.endDate).getTime(),
  };
}

export function getTripStatus(trip: Pick<Trip, "startDate" | "endDate">): TripTimingStatus {
  const today = getToday().getTime();
  const { start, end } = getTripRange(trip);

  if (start <= today && today <= end) {
    return "current";
  }

  if (start > today) {
    return "future";
  }

  return "past";
}

export function getCurrentTrip(trips: Trip[]): Trip | null {
  return trips.find((trip) => getTripStatus(trip) === "current") || null;
}

export function getNextTrip(trips: Trip[]): Trip | null {
  const futureTrips = trips
    .filter((trip) => getTripStatus(trip) === "future")
    .sort((a, b) => parseDateOnly(a.startDate).getTime() - parseDateOnly(b.startDate).getTime());

  return futureTrips[0] || null;
}

export function getDaysUntil(dateStr: string): number {
  const today = getToday().getTime();
  const target = parseDateOnly(dateStr).getTime();
  return Math.ceil((target - today) / MS_PER_DAY);
}

export function getCurrentDay(trip: Pick<Trip, "startDate" | "endDate">): number {
  const today = getToday().getTime();
  const { start } = getTripRange(trip);
  return Math.floor((today - start) / MS_PER_DAY) + 1;
}

export function getTotalDays(trip: Pick<Trip, "startDate" | "endDate">): number {
  const { start, end } = getTripRange(trip);
  return Math.ceil((end - start) / MS_PER_DAY) + 1;
}

export function formatTripDate(dateStr: string, month: "short" | "long" = "short"): string {
  return parseDateOnly(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month,
  });
}
