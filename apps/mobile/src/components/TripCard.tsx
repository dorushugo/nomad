import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { colors, fonts, fontSize, radius, spacing, shadow } from "../theme";
import type { Trip } from "../stores/tripStore";
import {
  formatTripDate,
  getDaysUntil,
  getTotalDays,
  getTripStatus,
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
      {/* Colored accent top */}
      <View style={styles.accentBar} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.destination}>{trip.destination}</Text>
            <Text style={styles.dates}>
              {formatTripDate(trip.startDate)} - {formatTripDate(trip.endDate)}
            </Text>
          </View>
          {tripStatus === "current" && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>En cours</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {trip.title}
        </Text>

        {trip.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {trip.description}
          </Text>
        ) : null}

        {daysUntil !== null && (
          <View style={styles.countdownCard}>
            <View style={styles.countdownContent}>
              <View style={styles.countdownNumberWrap}>
                <Text style={styles.countdownNumber}>{daysUntil}</Text>
              </View>
              <Text style={styles.countdownLabel}>
                jour{daysUntil > 1 ? "s" : ""} avant le départ
              </Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{dayCount} jour{dayCount > 1 ? "s" : ""}</Text>
          </View>
          {itemCount > 0 && (
            <View style={[styles.pill, styles.pillMuted]}>
              <Text style={[styles.pillText, styles.pillTextMuted]}>
                {itemCount} activité{itemCount > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.grayLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  emoji: {
    fontSize: 22,
  },
  meta: {
    flex: 1,
  },
  currentBadge: {
    backgroundColor: "rgba(0, 138, 5, 0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  currentBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xs,
    color: colors.green,
  },
  destination: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
    color: colors.rose,
    letterSpacing: 0.3,
  },
  dates: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.grayMuted,
    marginTop: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.black,
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.gray,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  countdownCard: {
    backgroundColor: colors.roseLight,
    borderWidth: 1,
    borderColor: colors.roseMuted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 64,
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  countdownContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    paddingVertical: 0,
  },
  countdownNumberWrap: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  countdownNumber: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xxxl,
    color: colors.rose,
    textAlign: "center",
  },
  countdownLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.lg,
    color: colors.darkGray,
    textAlign: "center",
    flexShrink: 1,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pill: {
    backgroundColor: colors.roseMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  pillText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.rose,
  },
  pillMuted: {
    backgroundColor: colors.grayLight,
  },
  pillTextMuted: {
    color: colors.gray,
  },
});
