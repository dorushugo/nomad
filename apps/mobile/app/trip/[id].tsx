import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  PanResponder,
  LayoutChangeEvent,
} from "react-native";
import { useLocalSearchParams, router, Stack, useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Plus } from "lucide-react-native";
import { useTripStore, Item } from "../../src/stores/tripStore";
import { LoadingOverlay } from "../../src/components/LoadingOverlay";
import { TimelineBlock } from "../../src/components/TimelineBlock";
import { TravelIndicator } from "../../src/components/TravelIndicator";
import { Button } from "../../src/components/Button";
import { colors, fonts, fontSize, radius, spacing, shadow } from "../../src/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const HOUR_HEIGHT = 72;
const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const TIMELINE_LEFT = 80;
const SNAP_MINUTES = 15; // Snap to 15-min intervals
const TOUCH_Y_OFFSET = -15; // Offset to align selection with top of finger

function formatDayLabel(dateStr: string) {
  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString("fr-FR", { weekday: "short" });
  const dayNum = date.getDate();
  return { dayName, dayNum };
}

function parseTime(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1]) + parseInt(match[2]) / 60;
}

function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function snapToQuarter(hour: number): number {
  return Math.round(hour * (60 / SNAP_MINUTES)) / (60 / SNAP_MINUTES);
}

function yToHour(y: number): number {
  return snapToQuarter(START_HOUR + y / HOUR_HEIGHT);
}

function getItemPosition(item: Item) {
  if (!item.startTime) return null;
  const start = parseTime(item.startTime);
  if (start == null) return null;
  const end = item.endTime ? parseTime(item.endTime) : null;
  const duration = end != null && end > start ? end - start : 0.75;
  const top = (start - START_HOUR) * HOUR_HEIGHT;
  const height = Math.max(duration * HOUR_HEIGHT, 44);
  return { top, height };
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, fetchTrip, deleteTrip, deleteItem } = useTripStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Drag selection state
  const [dragSelection, setDragSelection] = useState<{
    startHour: number;
    endHour: number;
  } | null>(null);
  const gridOriginY = useRef(0);
  const scrollOffsetY = useRef(0);
  const isDragging = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const trip = trips.find((t) => t.id === id);

  const fabScale = useSharedValue(1);
  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      if (id) fetchTrip(id);
    }, [id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (id) await fetchTrip(id);
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer ce voyage ?",
      "Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            if (id) {
              setIsLoading(true);
              await deleteTrip(id);
              router.back();
            }
          },
        },
      ]
    );
  };

  // Long press + drag to select a time range on the timeline
  const touchStartTime = useRef(0);
  const touchStartY = useRef(0);
  const dragAnchorHour = useRef(0);
  const LONG_PRESS_DELAY = 200;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt) => {
        const holdDuration = Date.now() - touchStartTime.current;
        const isInContentZone = evt.nativeEvent.locationX > TIMELINE_LEFT;
        return isInContentZone && holdDuration >= LONG_PRESS_DELAY;
      },
      onPanResponderGrant: () => {
        const y = touchStartY.current + TOUCH_Y_OFFSET;
        const hour = yToHour(Math.max(0, y));
        const clampedHour = Math.max(START_HOUR, Math.min(END_HOUR, hour));
        dragAnchorHour.current = clampedHour;
        isDragging.current = true;
        setDragSelection({
          startHour: clampedHour,
          endHour: Math.min(clampedHour + 0.25, END_HOUR + 1),
        });
      },
      onPanResponderMove: (evt) => {
        if (!isDragging.current) return;
        const y = evt.nativeEvent.locationY + TOUCH_Y_OFFSET;
        const hour = yToHour(Math.max(0, y));
        const clampedHour = Math.max(START_HOUR, Math.min(END_HOUR + 1, hour));
        const anchor = dragAnchorHour.current;

        setDragSelection({
          startHour: Math.min(anchor, clampedHour),
          endHour: Math.max(anchor + 0.25, Math.max(anchor, clampedHour)),
        });
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        setDragSelection((sel) => {
          if (sel && sel.endHour - sel.startHour >= 0.25) {
            setTimeout(() => {
              const startTime = formatHour(sel.startHour);
              const endTime = formatHour(sel.endHour);
              const day = currentDayRef.current;
              if (day) {
                router.push(
                  `/trip/add-item?dayId=${day.id}&startTime=${startTime}&endTime=${endTime}`
                );
              }
            }, 50);
          }
          return null;
        });
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        setDragSelection(null);
      },
    })
  ).current;

  // Ref to pass currentDay to panResponder callbacks
  const currentDayRef = useRef<typeof currentDay>(null);

  if (!trip) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </>
    );
  }

  const days = trip.days || [];
  const currentDay = days[selectedDayIndex];
  currentDayRef.current = currentDay;
  const items = currentDay?.items ?? [];

  const scheduledItems = items
    .filter((i) => i.startTime && parseTime(i.startTime) != null)
    .sort((a, b) => parseTime(a.startTime!)! - parseTime(b.startTime!)!);
  const unscheduledItems = items.filter(
    (i) => !i.startTime || parseTime(i.startTime) == null
  );

  // Selection overlay position
  const selectionStyle = dragSelection
    ? {
        top: (dragSelection.startHour - START_HOUR) * HOUR_HEIGHT,
        height: (dragSelection.endHour - dragSelection.startHour) * HOUR_HEIGHT,
      }
    : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "",
          headerStyle: { backgroundColor: colors.white },
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>Supprimer</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Trip Header - Compact */}
        <View style={styles.tripHeader}>
          <View style={styles.headerRow}>
            {trip.emoji ? (
              <Text style={styles.headerEmoji}>{trip.emoji}</Text>
            ) : null}
            <View style={styles.headerInfo}>
              <Text style={styles.destination}>{trip.destination}</Text>
              <Text style={styles.title} numberOfLines={1}>
                {trip.title}
              </Text>
            </View>
          </View>
          <Text style={styles.dates}>
            {new Date(trip.startDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}{" "}
            →{" "}
            {new Date(trip.endDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* Day Selector Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayScroll}
          contentContainerStyle={styles.dayScrollContent}
        >
          {days.map((day, index) => {
            const { dayName, dayNum } = formatDayLabel(day.date);
            const isActive = index === selectedDayIndex;
            const hasItems = day.items && day.items.length > 0;
            return (
              <Pressable
                key={day.id}
                onPress={() => setSelectedDayIndex(index)}
                style={[styles.dayPill, isActive && styles.dayPillActive]}
              >
                <Text
                  style={[styles.dayPillName, isActive && styles.dayPillNameActive]}
                >
                  {dayName}
                </Text>
                <Text
                  style={[styles.dayPillNum, isActive && styles.dayPillNumActive]}
                >
                  {dayNum}
                </Text>
                {hasItems && !isActive && <View style={styles.dayDot} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Timeline */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.timelineScroll}
          contentContainerStyle={styles.timelineContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isDragging.current}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.rose}
            />
          }
        >
          {/* Hour grid with long-press + drag gesture */}
          <View
            style={styles.timelineGrid}
            onTouchStart={(e) => {
              touchStartTime.current = Date.now();
              touchStartY.current = e.nativeEvent.locationY;
            }}
            {...panResponder.panHandlers}
          >
            {/* Hour lines */}
            {HOURS.map((hour) => (
              <View
                key={hour}
                style={[
                  styles.hourRow,
                  { top: (hour - START_HOUR) * HOUR_HEIGHT },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.hourLabel}>
                  {String(hour).padStart(2, "0")}:00
                </Text>
                <View style={styles.hourSlot}>
                  <View style={styles.hourLine} />
                </View>
              </View>
            ))}

            {/* Drag selection overlay */}
            {selectionStyle && (
              <View
                style={[styles.selectionOverlay, selectionStyle]}
                pointerEvents="none"
              >
                <View style={styles.selectionContent}>
                  <Text style={styles.selectionTime}>
                    {formatHour(dragSelection!.startHour)} — {formatHour(dragSelection!.endHour)}
                  </Text>
                  <Text style={styles.selectionHint}>Nouvel élément</Text>
                </View>
              </View>
            )}

            {/* Scheduled items */}
            {scheduledItems.map((item) => {
              const pos = getItemPosition(item);
              if (!pos) return null;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.timelineItem,
                    { top: pos.top, height: pos.height },
                  ]}
                >
                  <TimelineBlock
                    item={item}
                    onPress={() =>
                      router.push(`/trip/edit-item?itemId=${item.id}`)
                    }
                    onDelete={() => deleteItem(item.id)}
                  />
                </View>
              );
            })}

            {/* Travel indicators */}
            {scheduledItems.map((item, index) => {
              if (index === 0) return null;
              const prev = scheduledItems[index - 1];
              if (!prev.location || !item.location) return null;

              const prevPos = getItemPosition(prev);
              const currPos = getItemPosition(item);
              if (!prevPos || !currPos) return null;

              const gapTop = prevPos.top + prevPos.height;
              const gapHeight = currPos.top - gapTop;
              if (gapHeight < 24) return null;

              return (
                <View
                  key={`travel-${prev.id}-${item.id}`}
                  style={[
                    styles.travelContainer,
                    { top: gapTop, height: gapHeight },
                  ]}
                >
                  <TravelIndicator
                    originLocation={prev.location}
                    destinationLocation={item.location}
                  />
                </View>
              );
            })}

            {/* Spacer */}
            <View
              style={{ height: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT + 40 }}
            />
          </View>

          {/* Unscheduled items */}
          {unscheduledItems.length > 0 && (
            <View style={styles.unscheduledSection}>
              <Text style={styles.unscheduledTitle}>Non planifié</Text>
              {unscheduledItems.map((item, index) => (
                <View key={item.id}>
                  <TimelineBlock
                    item={item}
                    onPress={() =>
                      router.push(`/trip/edit-item?itemId=${item.id}`)
                    }
                    onDelete={() => deleteItem(item.id)}
                  />
                  {index < unscheduledItems.length - 1 &&
                    item.location &&
                    unscheduledItems[index + 1].location && (
                      <TravelIndicator
                        originLocation={item.location}
                        destinationLocation={unscheduledItems[index + 1].location!}
                      />
                    )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* FAB */}
        {currentDay && (
          <AnimatedPressable
            onPress={() =>
              router.push(`/trip/add-item?dayId=${currentDay.id}`)
            }
            onPressIn={() => {
              fabScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
            }}
            onPressOut={() => {
              fabScale.value = withSpring(1, { damping: 12, stiffness: 300 });
            }}
            style={[styles.fab, fabAnimStyle]}
          >
            <Plus size={28} color={colors.white} strokeWidth={2.5} />
          </AnimatedPressable>
        )}
        <LoadingOverlay visible={isLoading} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.grayLight,
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.gray,
  },
  // Header
  tripHeader: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    ...shadow.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  headerEmoji: {
    fontSize: 36,
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  destination: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xxs,
    color: colors.rose,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.black,
    letterSpacing: -0.5,
  },
  dates: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.gray,
  },
  deleteBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  deleteBtnText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.red,
  },
  // Day selector
  dayScroll: {
    maxHeight: 90,
    marginTop: spacing.md,
  },
  dayScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  dayPill: {
    width: 56,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.grayBorder,
  },
  dayPillActive: {
    backgroundColor: colors.rose,
    borderColor: colors.rose,
    ...shadow.md,
    shadowColor: colors.rose,
  },
  dayPillName: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xxs,
    color: colors.grayMuted,
    textTransform: "capitalize",
    marginBottom: 2,
  },
  dayPillNameActive: {
    color: "rgba(255,255,255,0.7)",
  },
  dayPillNum: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.black,
    letterSpacing: -0.5,
  },
  dayPillNumActive: {
    color: colors.white,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.rose,
    marginTop: 3,
  },
  // Timeline
  timelineScroll: {
    flex: 1,
    marginTop: spacing.sm,
  },
  timelineContent: {
    paddingBottom: 100,
  },
  timelineGrid: {
    position: "relative",
  },
  hourRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    height: HOUR_HEIGHT,
  },
  hourLabel: {
    width: TIMELINE_LEFT,
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.grayMuted,
    textAlign: "right",
    paddingRight: spacing.md,
    marginTop: -6,
  },
  hourSlot: {
    flex: 1,
    height: HOUR_HEIGHT,
  },
  hourLine: {
    height: 1,
    backgroundColor: colors.grayBorder,
  },
  // Drag selection overlay
  selectionOverlay: {
    position: "absolute",
    left: TIMELINE_LEFT + spacing.xs,
    right: spacing.lg,
    backgroundColor: colors.roseMuted,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.rose,
    borderStyle: "dashed",
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 36,
  },
  selectionContent: {
    alignItems: "center",
  },
  selectionTime: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
    color: colors.rose,
  },
  selectionHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xxs,
    color: colors.rose,
    marginTop: 2,
  },
  // Items
  timelineItem: {
    position: "absolute",
    left: TIMELINE_LEFT + spacing.sm,
    right: spacing.lg,
    zIndex: 2,
  },
  travelContainer: {
    position: "absolute",
    left: TIMELINE_LEFT + spacing.sm,
    right: spacing.lg,
    justifyContent: "center",
    zIndex: 1,
  },
  // Unscheduled
  unscheduledSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  unscheduledTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
    color: colors.grayMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  // FAB
  fab: {
    position: "absolute",
    bottom: 32,
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.rose,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.lg,
    shadowColor: colors.rose,
  },
});
