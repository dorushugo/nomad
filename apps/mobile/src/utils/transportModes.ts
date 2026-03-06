export const transportModes = [
  { key: "avion", emoji: "✈️", label: "Avion" },
  { key: "train", emoji: "🚆", label: "Train" },
  { key: "voiture", emoji: "🚗", label: "Voiture" },
  { key: "bus", emoji: "🚌", label: "Bus" },
  { key: "metro", emoji: "🚇", label: "Métro" },
  { key: "velo", emoji: "🚲", label: "Vélo" },
  { key: "a_pied", emoji: "🚶", label: "À pied" },
  { key: "autre", emoji: "📦", label: "Autre" },
] as const;

export type TransportMode = (typeof transportModes)[number]["key"];

const GROUND_MODES: TransportMode[] = ["voiture", "bus", "velo", "a_pied", "metro"];

export function shouldCalculateDuration(mode: string | undefined): boolean {
  return GROUND_MODES.includes(mode as TransportMode);
}

export function getTransportModeEmoji(mode: string | undefined): string {
  return transportModes.find((m) => m.key === mode)?.emoji ?? "✈️";
}
