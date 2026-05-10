import type { Day, Item } from "@nomad/shared";
import { FileText, Hotel, type LucideIcon, MapPin, Plane } from "lucide-react-native";
import { HOUR_HEIGHT, SNAP_MINUTES, START_HOUR } from "./timeline.constants";

export interface DayLabel {
  dayName: string;
  dayNum: number;
}

export function formatDayLabel(dateStr: string): DayLabel {
  const date = new Date(dateStr);
  return {
    dayName: date.toLocaleDateString("fr-FR", { weekday: "short" }),
    dayNum: date.getDate(),
  };
}

// Parses HH:mm into a fractional hour (e.g. "08:30" -> 8.5). Returns null
// if the string isn't a valid time of day.
export function parseTime(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number.parseInt(match[1], 10) + Number.parseInt(match[2], 10) / 60;
}

// Worklet — runs on the UI thread for animated label updates.
export function formatHour(hour: number): string {
  "worklet";
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const hStr = h < 10 ? `0${h}` : `${h}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${hStr}:${mStr}`;
}

export function snapToQuarter(hour: number): number {
  return Math.round(hour * (60 / SNAP_MINUTES)) / (60 / SNAP_MINUTES);
}

export function yToHour(y: number): number {
  return snapToQuarter(START_HOUR + y / HOUR_HEIGHT);
}

export interface ItemPosition {
  top: number;
  height: number;
}

// null when the item has no startTime (idea/unplanned).
export function getItemPosition(item: Item): ItemPosition | null {
  if (!item.startTime) return null;
  const start = parseTime(item.startTime);
  if (start == null) return null;
  const end = item.endTime ? parseTime(item.endTime) : null;
  const duration = end != null && end > start ? end - start : 0.75;
  return {
    top: (start - START_HOUR) * HOUR_HEIGHT,
    height: Math.max(duration * HOUR_HEIGHT, 44),
  };
}

export interface ItemTypeConfig {
  icon: LucideIcon;
  color: string;
}

const TYPE_CONFIG: Record<string, ItemTypeConfig> = {
  activity: { icon: MapPin, color: "#FF385C" },
  accommodation: { icon: Hotel, color: "#428BFF" },
  transport: { icon: Plane, color: "#E07912" },
  note: { icon: FileText, color: "#717171" },
};

export function getItemTypeConfig(type: string): ItemTypeConfig {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.activity;
}

export type DistributionAssignment = { itemId: string; dayId: string };

// Spread unplanned ideas across the trip's days. Accommodations land on
// day 0 (heuristic); other items go to the day with the lightest load
// (excluding accommodations from the load count).
export function distributeIdeas(ideas: Item[], days: Day[]): DistributionAssignment[] {
  if (days.length === 0) return [];
  const typePriority: Record<string, number> = {
    accommodation: 0,
    transport: 1,
    activity: 2,
    note: 3,
  };
  const sorted = [...ideas].sort(
    (a, b) => (typePriority[a.type] ?? 2) - (typePriority[b.type] ?? 2)
  );
  const dayLoad = days.map((day) => ({
    day,
    load: (day.items ?? []).filter((i) => i.type !== "accommodation").length,
  }));
  const assignments: DistributionAssignment[] = [];
  for (const idea of sorted) {
    if (idea.type === "accommodation") {
      assignments.push({ itemId: idea.id, dayId: days[0].id });
      continue;
    }
    const minDay = dayLoad.reduce((min, curr) => (curr.load < min.load ? curr : min));
    assignments.push({ itemId: idea.id, dayId: minDay.day.id });
    minDay.load++;
  }
  return assignments;
}
