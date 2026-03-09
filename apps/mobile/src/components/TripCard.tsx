import { View, Text, StyleSheet, Pressable } from "react-native";
import { CalendarDays } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { colors, fonts, fontSize, radius, spacing, shadow } from "../theme";
import type { Trip } from "../stores/tripStore";
import {
  formatTripDate,
  getCurrentDay,
  getDaysUntil,
  getTotalDays,
  getTripStatus,
  type TripTimingStatus,
} from "../utils/tripDates";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.8 };

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
}

const DESTINATION_EMOJIS: Record<string, string> = {
  japon: "🗼",
  japan: "🗼",
  tokyo: "🗼",
  paris: "🗼",
  france: "🇫🇷",
  italie: "🇮🇹",
  italy: "🇮🇹",
  espagne: "🇪🇸",
  spain: "🇪🇸",
  bali: "🌴",
  thailande: "🏝️",
  thailand: "🏝️",
  usa: "🇺🇸",
  maroc: "🕌",
  grece: "🏛️",
  greece: "🏛️",
  portugal: "🇵🇹",
  mexique: "🇲🇽",
  mexico: "🇲🇽",
};

function getDestinationEmoji(destination: string) {
  const lower = destination.toLowerCase();
  for (const [key, emoji] of Object.entries(DESTINATION_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return "✈️";
}

function getItemCount(trip: Trip) {
  return trip.days?.reduce((acc, day) => acc + (day.items?.length || 0), 0) || 0;
}

function getStatusBadge(status: TripTimingStatus) {
  switch (status) {
    case "current":
      return {
        label: "En cours",
        backgroundColor: "rgba(0, 138, 5, 0.12)",
        color: colors.green,
      };
    case "past":
      return {
        label: "Terminé",
        backgroundColor: colors.grayLight,
        color: colors.darkGray,
      };
    case "future":
    default:
      return {
        label: "À venir",
        backgroundColor: colors.roseLight,
        color: colors.rose,
      };
  }
}

function formatCountdown(daysUntil: number | null) {
  if (daysUntil === null) return null;
  if (daysUntil <= 0) return "Aujourd'hui";
  if (daysUntil === 1) return "Demain";
  return `Dans ${daysUntil} jours`;
}

function getStatusSummary(
  trip: Trip,
  status: TripTimingStatus,
  dayCount: number,
  daysUntil: number | null
) {
  switch (status) {
    case "current":
      return {
        label: "Aujourd'hui",
        value: `Jour ${getCurrentDay(trip)} / ${dayCount}`,
        backgroundColor: "rgba(0, 138, 5, 0.08)",
        borderColor: "rgba(0, 138, 5, 0.18)",
        labelColor: colors.green,
        valueColor: colors.black,
      };
    case "past":
      return {
        label: "Statut",
        value: "Terminé",
        backgroundColor: colors.grayLight,
        borderColor: colors.grayBorder,
        labelColor: colors.gray,
        valueColor: colors.black,
      };
    case "future":
    default:
      return {
        label: "Départ",
        value: formatCountdown(daysUntil) || "À définir",
        backgroundColor: colors.roseLight,
        borderColor: colors.roseMuted,
        labelColor: colors.rose,
        valueColor: colors.black,
      };
  }
}

export function TripCard({ trip, onPress }: TripCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dayCount = getTotalDays(trip);
  const itemCount = getItemCount(trip);
  const emoji = trip.emoji || getDestinationEmoji(trip.destination);
  const tripStatus = getTripStatus(trip);
  const daysUntil = tripStatus === "future" ? getDaysUntil(trip.startDate) : null;
  const statusBadge = getStatusBadge(tripStatus);
  const statusSummary = getStatusSummary(trip, tripStatus, dayCount, daysUntil);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, SPRING_CONFIG);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
      style={[styles.card, animatedStyle]}
    >
      <View style={styles.accentBar} />

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {trip.title}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusBadge.backgroundColor },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                  {statusBadge.label}
                </Text>
              </View>
            </View>
            <Text style={styles.destination} numberOfLines={1}>
              {trip.destination}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <CalendarDays size={16} color={colors.gray} strokeWidth={2.2} />
          <Text style={styles.dates}>
            {formatTripDate(trip.startDate)} - {formatTripDate(trip.endDate)}
          </Text>
        </View>

        {trip.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {trip.description}
          </Text>
        ) : null}

        <View
          style={[
            styles.summaryRow,
            !trip.description ? styles.summaryRowNoDescription : null,
          ]}
        >
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: statusSummary.backgroundColor,
                borderColor: statusSummary.borderColor,
              },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: statusSummary.labelColor }]}>
              {statusSummary.label}
            </Text>
            <Text style={[styles.summaryValue, { color: statusSummary.valueColor }]}>
              {statusSummary.value}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Durée</Text>
            <Text style={styles.summaryValue}>
              {dayCount} jour{dayCount > 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {itemCount > 0 && (
          <View style={styles.footer}>
            <View style={[styles.pill, styles.pillMuted]}>
              <Text style={styles.pillLabel}>Programme</Text>
              <Text style={[styles.pillText, styles.pillTextMuted]}>
                {itemCount} activité{itemCount > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.grayBorder,
    ...shadow.md,
  },
  accentBar: {
    height: 4,
    backgroundColor: colors.rose,
  },
  body: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  emojiContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.grayLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  emoji: {
    fontSize: 24,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  statusBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: 0.2,
  },
  destination: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    color: colors.rose,
    letterSpacing: -0.1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.black,
    letterSpacing: -0.3,
    flex: 1,
    flexShrink: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginTop: spacing.md,
  },
  dates: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.gray,
    lineHeight: 20,
    marginBottom: spacing.md,
    marginTop: spacing.sm + 2,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryRowNoDescription: {
    marginTop: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.grayLight,
    borderWidth: 1,
    borderColor: colors.grayBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 78,
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xs,
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.black,
    letterSpacing: -0.2,
  },
  footer: {
    flexDirection: "row",
    marginTop: spacing.md,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
  },
  pillLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xs,
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pillText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
  },
  pillMuted: {
    backgroundColor: colors.grayLight,
    borderWidth: 1,
    borderColor: colors.grayBorder,
  },
  pillTextMuted: {
    color: colors.black,
  },
});
