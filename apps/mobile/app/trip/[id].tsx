import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, router, Stack, useFocusEffect } from "expo-router";
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useDerivedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Plus } from "lucide-react-native";
import { useTripStore, Item } from "../../src/stores/tripStore";
import { LoadingOverlay } from "../../src/components/LoadingOverlay";
import { TimelineBlock } from "../../src/components/TimelineBlock";
import { TravelIndicator } from "../../src/components/TravelIndicator";
import { DraggableItemList } from "../../src/components/DraggableItemList";
import { Button } from "../../src/components/Button";
import { AccommodationCard } from "../../src/components/AccommodationCard";
import { colors, fonts, fontSize, radius, spacing, shadow } from "../../src/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

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
  "worklet";
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const hStr = h < 10 ? "0" + h : "" + h;
  const mStr = m < 10 ? "0" + m : "" + m;
  return hStr + ":" + mStr;
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

function DraggableTimelineItem({
  item,
  pos,
  draggedItemId,
  dragDeltaY,
  onPress,
  onDelete,
}: {
  item: Item;
  pos: { top: number; height: number };
  draggedItemId: SharedValue<string>;
  dragDeltaY: SharedValue<number>;
  onPress: () => void;
  onDelete: () => void;
}) {
  // Use shared values for position so Reanimated picks up changes on re-render
  const topSV = useSharedValue(pos.top);
  const heightSV = useSharedValue(pos.height);

  useEffect(() => {
    topSV.value = pos.top;
    heightSV.value = pos.height;
  }, [pos.top, pos.height]);

  const animStyle = useAnimatedStyle(() => {
    const isDragged = draggedItemId.value === item.id;
    return {
      top: topSV.value,
      height: heightSV.value,
      transform: [
        { translateY: isDragged ? dragDeltaY.value : 0 } as const,
        { scale: isDragged ? 1.04 : 1 } as const,
      ],
      zIndex: isDragged ? 100 : 2,
    };
  });

  return (
    <Animated.View style={[styles.timelineItem, animStyle]}>
      <TimelineBlock item={item} onPress={onPress} onDelete={onDelete} fill />
    </Animated.View>
  );
}

const MAX_VISIBLE_DAYS = 6;
const DAY_GAP = spacing.sm;

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, fetchTrip, deleteTrip, deleteItem, updateItem, reorderItems } = useTripStore();
  const { width: screenWidth } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");

  // Drag selection (shared values for 60fps)
  const selStartHour = useSharedValue(0);
  const selEndHour = useSharedValue(0);
  const selVisible = useSharedValue(false);
  const gridOriginY = useRef(0);
  const scrollOffsetY = useRef(0);
  const isDragging = useRef(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Drag-to-move existing items
  const dragMode = useRef<"create" | "move">("create");
  const draggedItemId = useSharedValue("");
  const dragDeltaY = useSharedValue(0);
  const dragItemOriginal = useRef<{ itemId: string; startHour: number; endHour: number } | null>(null);
  const scheduledItemsRef = useRef<Item[]>([]);

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
  const LONG_PRESS_DELAY = 150;

  const navigateToAddItem = useCallback((startH: number, endH: number) => {
    const day = currentDayRef.current;
    if (day) {
      router.push(
        `/trip/add-item?dayId=${day.id}&startTime=${formatHour(startH)}&endTime=${formatHour(endH)}`
      );
    }
  }, []);

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
        const touchHour = START_HOUR + Math.max(0, y) / HOUR_HEIGHT;

        // Check if touch hits the center zone of an existing scheduled item
        const hitItem = scheduledItemsRef.current.find((item) => {
          const startH = parseTime(item.startTime!);
          if (startH == null) return false;
          const endH = item.endTime ? parseTime(item.endTime) : startH + 0.75;
          const actualEnd = endH ?? startH + 0.75;
          const duration = actualEnd - startH;
          // Shrink hitbox: 25% inset on each side, max 15min
          const inset = Math.min(duration * 0.25, 0.25);
          return touchHour >= startH + inset && touchHour <= actualEnd - inset;
        });

        isDragging.current = true;
        setScrollLocked(true);

        if (hitItem) {
          // Move existing item
          dragMode.current = "move";
          const startH = parseTime(hitItem.startTime!)!;
          const endH = hitItem.endTime ? parseTime(hitItem.endTime)! : startH + 0.75;
          dragItemOriginal.current = { itemId: hitItem.id, startHour: startH, endHour: endH };
          draggedItemId.value = hitItem.id;
          dragDeltaY.value = 0;
          dragAnchorHour.current = touchHour;
        } else {
          // Create new item
          dragMode.current = "create";
          const hour = yToHour(Math.max(0, y));
          const clampedHour = Math.max(START_HOUR, Math.min(END_HOUR, hour));
          dragAnchorHour.current = clampedHour;
          selStartHour.value = clampedHour;
          selEndHour.value = Math.min(clampedHour + 0.25, END_HOUR + 1);
          selVisible.value = true;
        }
      },
      onPanResponderMove: (evt) => {
        if (!isDragging.current) return;
        const y = evt.nativeEvent.locationY + TOUCH_Y_OFFSET;

        if (dragMode.current === "move") {
          const currentHour = START_HOUR + Math.max(0, y) / HOUR_HEIGHT;
          const deltaHours = currentHour - dragAnchorHour.current;
          dragDeltaY.value = deltaHours * HOUR_HEIGHT;
        } else {
          const hour = yToHour(Math.max(0, y));
          const clampedHour = Math.max(START_HOUR, Math.min(END_HOUR + 1, hour));
          const anchor = dragAnchorHour.current;
          selStartHour.value = Math.min(anchor, clampedHour);
          selEndHour.value = Math.max(anchor + 0.25, Math.max(anchor, clampedHour));
        }
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        setScrollLocked(false);

        if (dragMode.current === "move" && dragItemOriginal.current) {
          const orig = dragItemOriginal.current;
          const deltaHours = dragDeltaY.value / HOUR_HEIGHT;
          const duration = orig.endHour - orig.startHour;
          const newStart = snapToQuarter(orig.startHour + deltaHours);
          const clampedStart = Math.max(START_HOUR, Math.min(END_HOUR + 1 - duration, newStart));
          const clampedEnd = clampedStart + duration;

          // Reset drag visuals
          draggedItemId.value = "";
          dragDeltaY.value = 0;
          dragItemOriginal.current = null;

          if (Math.abs(clampedStart - orig.startHour) >= 0.01) {
            const newStartTime = formatHour(clampedStart);
            const newEndTime = formatHour(clampedEnd);
            // Optimistic store update for instant visual feedback
            useTripStore.setState((state) => ({
              trips: state.trips.map((trip) => ({
                ...trip,
                days: (trip.days ?? []).map((day) => ({
                  ...day,
                  items: (day.items ?? []).map((item) =>
                    item.id === orig.itemId
                      ? { ...item, startTime: newStartTime, endTime: newEndTime }
                      : item
                  ),
                })),
              })),
            }));
            // Persist to API
            updateItem(orig.itemId, { startTime: newStartTime, endTime: newEndTime });
          }
        } else {
          // Create mode
          const startH = selStartHour.value;
          const endH = selEndHour.value;
          selVisible.value = false;
          if (endH - startH >= 0.25) {
            navigateToAddItem(startH, endH);
          }
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        setScrollLocked(false);
        if (dragMode.current === "move") {
          draggedItemId.value = "";
          dragDeltaY.value = 0;
          dragItemOriginal.current = null;
        } else {
          selVisible.value = false;
        }
      },
    })
  ).current;

  // Animated overlay style (no re-renders during drag)
  const selectionAnimStyle = useAnimatedStyle(() => {
    if (!selVisible.value) {
      return { opacity: 0, top: 0, height: 0 };
    }
    return {
      opacity: 1,
      top: (selStartHour.value - START_HOUR) * HOUR_HEIGHT + 8,
      height: (selEndHour.value - selStartHour.value) * HOUR_HEIGHT,
    };
  });

  // Dynamic time label (runs on UI thread, no re-renders)
  const selTimeLabel = useDerivedValue(() => {
    if (!selVisible.value) return "";
    return formatHour(selStartHour.value) + " — " + formatHour(selEndHour.value);
  });
  const selTimeLabelProps = useAnimatedProps(() => ({
    text: selTimeLabel.value,
  }));

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

  const visibleDays = Math.min(days.length, MAX_VISIBLE_DAYS);
  const pillContainerWidth = screenWidth - 2 * spacing.lg;
  const pillWidth = visibleDays > 1
    ? (pillContainerWidth - DAY_GAP * (visibleDays - 1)) / visibleDays
    : pillContainerWidth;
  currentDayRef.current = currentDay;
  const items = currentDay?.items ?? [];

  // Accommodations: collect from all days and filter by date range
  const allAccommodations = days.flatMap((day) =>
    (day.items ?? []).filter((item) => item.type === "accommodation")
  );
  const dayDateStr = currentDay?.date?.slice(0, 10) ?? "";
  const activeAccommodations = allAccommodations.filter((acc) => {
    if (acc.startDate && acc.endDate) {
      return acc.startDate <= dayDateStr && dayDateStr <= acc.endDate;
    }
    return acc.dayId === currentDay?.id;
  });
  const uniqueAccommodations = [
    ...new Map(activeAccommodations.map((a) => [a.id, a])).values(),
  ];

  // Exclude accommodations from the timeline
  const nonAccommodationItems = items.filter((i) => i.type !== "accommodation");

  const scheduledItems = nonAccommodationItems
    .filter((i) => i.startTime && parseTime(i.startTime) != null)
    .sort((a, b) => parseTime(a.startTime!)! - parseTime(b.startTime!)!);
  scheduledItemsRef.current = scheduledItems;
  const unscheduledItems = nonAccommodationItems
    .filter((i) => !i.startTime || parseTime(i.startTime) == null)
    .sort((a, b) => a.order - b.order);

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
            const hasItems = (day.items ?? []).length > 0;
            return (
              <Pressable
                key={day.id}
                onPress={() => setSelectedDayIndex(index)}
                style={[styles.dayPill, { width: pillWidth }, isActive && styles.dayPillActive]}
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

        {/* View toggle */}
        <View style={styles.viewToggle}>
          <Pressable
            onPress={() => setViewMode("timeline")}
            style={[styles.toggleBtn, viewMode === "timeline" && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleBtnText, viewMode === "timeline" && styles.toggleBtnTextActive]}>
              Timeline
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode("calendar")}
            style={[styles.toggleBtn, viewMode === "calendar" && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleBtnText, viewMode === "calendar" && styles.toggleBtnTextActive]}>
              Calendrier
            </Text>
          </Pressable>
        </View>

        {/* Accommodations */}
        {uniqueAccommodations.length > 0 && (
          <View style={styles.accommodationSection}>
            {uniqueAccommodations.map((acc) => (
              <AccommodationCard
                key={acc.id}
                item={acc}
                onPress={() =>
                  router.push(`/trip/edit-item?itemId=${acc.id}`)
                }
              />
            ))}
          </View>
        )}

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.timelineScroll}
          contentContainerStyle={styles.timelineContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!scrollLocked}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.rose}
            />
          }
        >
          {/* ── TIMELINE LIST VIEW ── */}
          {viewMode === "timeline" && (
            <View style={styles.timelineList}>
              {scheduledItems.length === 0 && unscheduledItems.length === 0 && (
                <Text style={styles.emptyText}>Aucun événement pour ce jour</Text>
              )}
              {scheduledItems.map((item) => (
                <TimelineBlock
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/trip/edit-item?itemId=${item.id}`)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
              {unscheduledItems.length > 0 && (
                <View style={scheduledItems.length > 0 ? styles.unscheduledSection : undefined}>
                  {scheduledItems.length > 0 && (
                    <Text style={styles.unscheduledTitle}>Non planifié</Text>
                  )}
                  <DraggableItemList
                    key={currentDay?.id}
                    items={unscheduledItems}
                    onReorder={(reordered) => {
                      const orderedItems = reordered.map((item, index) => ({
                        id: item.id,
                        order: index,
                      }));
                      reorderItems(currentDay!.id, orderedItems);
                    }}
                    onPressItem={(item) =>
                      router.push(`/trip/edit-item?itemId=${item.id}`)
                    }
                    onDeleteItem={(item) => deleteItem(item.id)}
                    onDragStateChange={setScrollLocked}
                  />
                </View>
              )}
            </View>
          )}

          {/* ── CALENDAR GRID VIEW ── */}
          {viewMode === "calendar" && (
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
            <Animated.View
              style={[styles.selectionOverlay, selectionAnimStyle]}
              pointerEvents="none"
            >
              <View style={styles.selectionContent}>
                <AnimatedTextInput
                  editable={false}
                  animatedProps={selTimeLabelProps}
                  style={styles.selectionHint}
                />
              </View>
            </Animated.View>

            {/* Scheduled items (draggable) */}
            {scheduledItems.map((item) => {
              const pos = getItemPosition(item);
              if (!pos) return null;
              return (
                <DraggableTimelineItem
                  key={item.id}
                  item={item}
                  pos={pos}
                  draggedItemId={draggedItemId}
                  dragDeltaY={dragDeltaY}
                  onPress={() =>
                    router.push(`/trip/edit-item?itemId=${item.id}`)
                  }
                  onDelete={() => deleteItem(item.id)}
                />
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
    gap: DAY_GAP,
    alignItems: "center",
  },
  dayPill: {
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
  // Accommodations
  accommodationSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
    paddingTop: 8,
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
    width: "100%",
  },
  selectionHint: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.rose,
    textAlign: "center" as const,
    padding: 0,
    width: "100%",
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
  // View toggle
  viewToggle: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.grayLight,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.grayBorder,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: colors.white,
    ...shadow.sm,
  },
  toggleBtnText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.grayMuted,
  },
  toggleBtnTextActive: {
    color: colors.black,
  },
  // Timeline list (non-calendar mode)
  timelineList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.grayMuted,
    textAlign: "center",
    marginTop: spacing.xxl,
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
