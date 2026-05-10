import { Plane, TrainFront, Car, Bus, TramFront, Bike, Footprints, Package } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

export type TransportMode = "avion" | "train" | "voiture" | "bus" | "metro" | "velo" | "a_pied" | "autre";

export const transportModes: { key: TransportMode; icon: LucideIcon; label: string }[] = [
  { key: "avion", icon: Plane, label: "Avion" },
  { key: "train", icon: TrainFront, label: "Train" },
  { key: "voiture", icon: Car, label: "Voiture" },
  { key: "bus", icon: Bus, label: "Bus" },
  { key: "metro", icon: TramFront, label: "Métro" },
  { key: "velo", icon: Bike, label: "Vélo" },
  { key: "a_pied", icon: Footprints, label: "À pied" },
  { key: "autre", icon: Package, label: "Autre" },
];

const GROUND_MODES: TransportMode[] = ["voiture", "bus", "velo", "a_pied", "metro"];

export function shouldCalculateDuration(mode: string | undefined): boolean {
  return GROUND_MODES.includes(mode as TransportMode);
}

export function getTransportModeIcon(mode: string | undefined): LucideIcon {
  return transportModes.find((m) => m.key === mode)?.icon ?? Plane;
}

export function getPlacesTypesForMode(mode: string | undefined): string {
  switch (mode) {
    case "avion": return "airport";
    case "train": return "transit_station";
    default: return "establishment";
  }
}

export function getPlacesPlaceholderForMode(mode: string | undefined): string {
  switch (mode) {
    case "avion": return "Rechercher un aéroport...";
    case "train": return "Rechercher une gare...";
    default: return "Gare, aéroport, ville...";
  }
}
