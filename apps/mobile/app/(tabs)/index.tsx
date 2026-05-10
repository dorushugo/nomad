import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Plus } from "lucide-react-native";
import { useAuthStore } from "../../src/stores/authStore";
import { useTripStore, Trip } from "../../src/stores/tripStore";
import { Button } from "../../src/components/Button";
import { fonts, fontSize, spacing, radius, shadow } from "../../src/theme";
import { useTheme } from "../../src/hooks/useTheme";
import type { ThemeColors } from "../../src/theme";
import {
  formatTripDate,
  getCurrentDay,
  getCurrentTrip,
  getDaysUntil,
  getNextTrip,
  getTotalDays,
} from "../../src/utils/tripDates";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { trips, fetchTrips } = useTripStore();
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  };

  const currentTrip = getCurrentTrip(trips);
  const nextTrip = !currentTrip ? getNextTrip(trips) : null;

  const fabScale = useSharedValue(1);
  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || "N"}
            </Text>
          </Pressable>
          <View style={styles.headerMeta}>
            <Text style={styles.headerGreeting}>Bonjour,</Text>
            <Text style={styles.headerName}>
              {user?.name?.split(" ")[0]} 👋
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.rose}
          />
        }
      >
        {currentTrip ? (
          <CurrentTripCard trip={currentTrip} colors={colors} />
        ) : nextTrip ? (
          <NextTripCard trip={nextTrip} colors={colors} />
        ) : (
          <EmptyState colors={colors} />
        )}
      </ScrollView>

      {/* FAB */}
      <AnimatedPressable
        onPress={() => router.push("/create-trip")}
        onPressIn={() => {
          fabScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          fabScale.value = withSpring(1, { damping: 12, stiffness: 300 });
        }}
        style={[styles.fab, fabAnimStyle]}
      >
        <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
      </AnimatedPressable>
    </View>
  );
}

function CurrentTripCard({ trip, colors }: { trip: Trip; colors: ThemeColors }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const styles = makeStyles(colors);

  const currentDay = getCurrentDay(trip);
  const totalDays = getTotalDays(trip);
  const progress = currentDay / totalDays;

  return (
    <View>
      <Text style={styles.sectionLabel}>Voyage en cours</Text>
      <AnimatedPressable
        onPress={() => router.push(`/trip/${trip.id}`)}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 300 });
        }}
        style={[styles.card, styles.currentCard, animStyle]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>{trip.emoji || "🌍"}</Text>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>
              Jour {currentDay}/{totalDays}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{trip.title}</Text>
        <Text style={styles.cardDestination}>{trip.destination}</Text>
        <Text style={styles.cardDates}>
          {formatTripDate(trip.startDate, "long")} — {formatTripDate(trip.endDate, "long")}
        </Text>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(progress * 100, 100)}%` },
            ]}
          />
        </View>
      </AnimatedPressable>
    </View>
  );
}

function NextTripCard({ trip, colors }: { trip: Trip; colors: ThemeColors }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const styles = makeStyles(colors);

  const daysUntil = getDaysUntil(trip.startDate);

  return (
    <View>
      <Text style={styles.sectionLabel}>Prochain voyage</Text>
      <AnimatedPressable
        onPress={() => router.push(`/trip/${trip.id}`)}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 300 });
        }}
        style={[styles.card, animStyle]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>{trip.emoji || "✈️"}</Text>
        </View>

        <Text style={styles.cardTitle}>{trip.title}</Text>
        <Text style={styles.cardDestination}>{trip.destination}</Text>
        <Text style={styles.cardDates}>
          {formatTripDate(trip.startDate, "long")} — {formatTripDate(trip.endDate, "long")}
        </Text>

        <View style={styles.countdownContainer}>
          <Text style={styles.countdownNumber}>{daysUntil}</Text>
          <Text style={styles.countdownLabel}>
            jour{daysUntil > 1 ? "s" : ""} restant{daysUntil > 1 ? "s" : ""}
          </Text>
        </View>
      </AnimatedPressable>
    </View>
  );
}

function EmptyState({ colors }: { colors: ThemeColors }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyEmoji}>🗺️</Text>
      </View>
      <Text style={styles.emptyTitle}>Aucun voyage prévu</Text>
      <Text style={styles.emptyText}>
        Planifie ta prochaine aventure et retrouve-la ici !
      </Text>
      <Button
        title="Créer un voyage"
        onPress={() => router.push("/create-trip")}
        size="md"
        style={{ marginTop: spacing.lg }}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.grayLight,
    },
    header: {
      backgroundColor: c.white,
      paddingTop: 60,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderBottomLeftRadius: radius.xxl,
      borderBottomRightRadius: radius.xxl,
      ...shadow.md,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: c.rose,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    avatarText: {
      fontFamily: fonts.bold,
      fontSize: fontSize.lg,
      color: "#FFFFFF",
    },
    headerMeta: {
      flex: 1,
    },
    headerGreeting: {
      fontFamily: fonts.regular,
      fontSize: fontSize.sm,
      color: c.gray,
    },
    headerName: {
      fontFamily: fonts.bold,
      fontSize: fontSize.xl,
      color: c.black,
      letterSpacing: -0.3,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: 40,
    },
    sectionLabel: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.sm,
      color: c.gray,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: c.white,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.grayBorder,
      ...shadow.md,
    },
    currentCard: {
      borderColor: c.rose,
      borderWidth: 2,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    cardEmoji: {
      fontSize: 36,
    },
    dayBadge: {
      backgroundColor: c.rose,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.full,
    },
    dayBadgeText: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.xs,
      color: "#FFFFFF",
    },
    cardTitle: {
      fontFamily: fonts.bold,
      fontSize: fontSize.xxl,
      color: c.black,
      letterSpacing: -0.5,
      marginBottom: spacing.xxs,
    },
    cardDestination: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.md,
      color: c.rose,
      marginBottom: spacing.xs,
    },
    cardDates: {
      fontFamily: fonts.regular,
      fontSize: fontSize.sm,
      color: c.gray,
      marginBottom: spacing.lg,
    },
    progressTrack: {
      height: 6,
      backgroundColor: c.grayBorder,
      borderRadius: radius.full,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: c.rose,
      borderRadius: radius.full,
    },
    countdownContainer: {
      alignItems: "center",
      backgroundColor: c.roseLight,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
    },
    countdownNumber: {
      fontFamily: fonts.bold,
      fontSize: fontSize.display,
      color: c.rose,
      lineHeight: fontSize.display * 1.2,
    },
    countdownLabel: {
      fontFamily: fonts.medium,
      fontSize: fontSize.sm,
      color: c.rose,
      marginTop: spacing.xxs,
    },
    empty: {
      alignItems: "center",
      paddingTop: spacing.xxxl,
      paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
      width: 96,
      height: 96,
      borderRadius: radius.full,
      backgroundColor: c.roseMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    emptyEmoji: {
      fontSize: 42,
    },
    emptyTitle: {
      fontFamily: fonts.bold,
      fontSize: fontSize.xl,
      color: c.black,
      marginBottom: spacing.sm,
      letterSpacing: -0.3,
    },
    emptyText: {
      fontFamily: fonts.regular,
      fontSize: fontSize.md,
      color: c.gray,
      textAlign: "center",
      lineHeight: 22,
    },
    fab: {
      position: "absolute",
      bottom: 32,
      right: spacing.lg,
      width: 60,
      height: 60,
      borderRadius: radius.full,
      backgroundColor: c.rose,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.lg,
      shadowColor: c.rose,
    },
  });
