import { router, useFocusEffect } from "expo-router";
import { Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Button } from "../../src/components/Button";
import { TripCard } from "../../src/components/TripCard";
import { useTheme } from "../../src/hooks/useTheme";
import { useTripStore } from "../../src/stores/tripStore";
import { fontSize, fonts, radius, shadow, spacing } from "../../src/theme";
import type { ThemeColors } from "../../src/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TripsScreen() {
  const { trips, fetchTrips } = useTripStore();
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const styles = makeStyles(colors);

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

  const fabScale = useSharedValue(1);
  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mes voyages</Text>
        <Text style={styles.sectionCount}>
          {trips.length > 0 ? `${trips.length} voyage${trips.length > 1 ? "s" : ""}` : ""}
        </Text>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TripCard trip={item} onPress={() => router.push(`/trip/${item.id}`)} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.rose} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyEmoji}>🗺️</Text>
            </View>
            <Text style={styles.emptyTitle}>Pas encore de voyage</Text>
            <Text style={styles.emptyText}>Lance-toi et planifie ta prochaine aventure</Text>
            <Button
              title="Créer un voyage"
              onPress={() => router.push("/create-trip")}
              size="md"
              style={{ marginTop: spacing.lg }}
            />
          </View>
        }
      />

      {trips.length > 0 && (
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
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.grayLight,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingHorizontal: spacing.lg,
      paddingTop: 68,
      paddingBottom: spacing.sm,
    },
    sectionTitle: {
      fontFamily: fonts.bold,
      fontSize: fontSize.xxl,
      color: c.black,
      letterSpacing: -0.5,
    },
    sectionCount: {
      fontFamily: fonts.medium,
      fontSize: fontSize.sm,
      color: c.grayMuted,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: 100,
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
