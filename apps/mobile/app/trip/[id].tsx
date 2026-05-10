import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Plus, Shuffle, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useDerivedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { AccommodationCard } from "../../src/components/AccommodationCard";
import { DraggableItemList } from "../../src/components/DraggableItemList";
import { LoadingOverlay } from "../../src/components/LoadingOverlay";
import { TimelineBlock } from "../../src/components/TimelineBlock";
import { TravelIndicator } from "../../src/components/TravelIndicator";
import {
  type DistributionAssignment,
  DraggableTimelineItem,
  END_HOUR,
  HOURS,
  HOUR_HEIGHT,
  MAX_VISIBLE_DAYS,
  START_HOUR,
  TIMELINE_LEFT,
  TOUCH_Y_OFFSET,
  distributeIdeas,
  formatDayLabel,
  formatHour,
  getItemPosition,
  getItemTypeConfig,
  parseTime,
  snapToQuarter,
  yToHour,
} from "../../src/features/timeline";
import { useTheme } from "../../src/hooks/useTheme";
import { type Item, useTripStore } from "../../src/stores/tripStore";
import { fontSize, fonts, radius, shadow, spacing } from "../../src/theme";
import type { ThemeColors } from "../../src/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const DAY_GAP = spacing.sm;
const FRENCH_DAY_NAMES = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const FRENCH_MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, fetchTrip, deleteTrip, deleteItem, updateItem, reorderItems, assignIdeaToDay } =
    useTripStore();
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"timeline" | "calendar" | "organize">("timeline");
  const [calendarSelectedDayIndex, setCalendarSelectedDayIndex] = useState<number | null>(null);
  const [distributionModal, setDistributionModal] = useState(false);
  const [distributionPlan, setDistributionPlan] = useState<DistributionAssignment[]>([]);
  const sheetTranslateY = useSharedValue(600);

  const closeDistributionModal = useCallback(() => {
    sheetTranslateY.value = withTiming(600, { duration: 250 }, (finished) => {
      if (finished) runOnJS(setDistributionModal)(false);
    });
  }, [sheetTranslateY]);

  useEffect(() => {
    if (distributionModal) {
      sheetTranslateY.value = withTiming(0, { duration: 300 });
    }
  }, [distributionModal, sheetTranslateY]);

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const selStartHour = useSharedValue(0);
  const selEndHour = useSharedValue(0);
  const selVisible = useSharedValue(false);
  const gridOriginY = useRef(0);
  const scrollOffsetY = useRef(0);
  const isDragging = useRef(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const dragMode = useRef<"create" | "move">("create");
  const draggedItemId = useSharedValue("");
  const dragDeltaY = useSharedValue(0);
  const dragItemOriginal = useRef<{ itemId: string; startHour: number; endHour: number } | null>(
    null
  );
  const scheduledItemsRef = useRef<Item[]>([]);

  const trip = trips.find((t) => t.id === id);

  const fabScale = useSharedValue(1);
  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      if (id) fetchTrip(id).catch(() => {});
    }, [id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (id) await fetchTrip(id);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Supprimer ce voyage ?", "Cette action est irréversible.", [
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
    ]);
  };

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
        const hitItem = scheduledItemsRef.current.find((item) => {
          const startH = parseTime(item.startTime!);
          if (startH == null) return false;
          const endH = item.endTime ? parseTime(item.endTime) : startH + 0.75;
          const actualEnd = endH ?? startH + 0.75;
          const duration = actualEnd - startH;
          const inset = Math.min(duration * 0.25, 0.25);
          return touchHour >= startH + inset && touchHour <= actualEnd - inset;
        });
        isDragging.current = true;
        setScrollLocked(true);
        if (hitItem) {
          dragMode.current = "move";
          const startH = parseTime(hitItem.startTime!)!;
          const endH = hitItem.endTime ? parseTime(hitItem.endTime)! : startH + 0.75;
          dragItemOriginal.current = { itemId: hitItem.id, startHour: startH, endHour: endH };
          draggedItemId.value = hitItem.id;
          dragDeltaY.value = 0;
          dragAnchorHour.current = touchHour;
        } else {
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
          draggedItemId.value = "";
          dragDeltaY.value = 0;
          dragItemOriginal.current = null;
          if (Math.abs(clampedStart - orig.startHour) >= 0.01) {
            const newStartTime = formatHour(clampedStart);
            const newEndTime = formatHour(clampedEnd);
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
            updateItem(orig.itemId, { startTime: newStartTime, endTime: newEndTime }).catch(
              () => {}
            );
          }
        } else {
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

  const selTimeLabel = useDerivedValue(() => {
    if (!selVisible.value) return "";
    return formatHour(selStartHour.value) + " — " + formatHour(selEndHour.value);
  });
  // TextInput.text isn't in the public TextInput props (it's a private/animated path
  // that Reanimated wires via the worklet shadow tree), so we widen here.
  const selTimeLabelProps = useAnimatedProps(
    () => ({ text: selTimeLabel.value }) as Partial<{ text: string }>
  ) as Partial<TextInputProps>;

  const currentDayRef = useRef<typeof currentDay>(null);

  const styles = makeStyles(colors);

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
  const pillWidth =
    visibleDays > 1
      ? (pillContainerWidth - DAY_GAP * (visibleDays - 1)) / visibleDays
      : pillContainerWidth;
  currentDayRef.current = currentDay;
  const items = currentDay?.items ?? [];

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
  const uniqueAccommodations = [...new Map(activeAccommodations.map((a) => [a.id, a])).values()];

  const nonAccommodationItems = items.filter((i) => i.type !== "accommodation");
  const scheduledItems = nonAccommodationItems
    .filter((i) => i.startTime && parseTime(i.startTime) != null)
    .sort((a, b) => parseTime(a.startTime!)! - parseTime(b.startTime!)!);
  scheduledItemsRef.current = scheduledItems;
  const unscheduledItems = nonAccommodationItems
    .filter((i) => !i.startTime || parseTime(i.startTime) == null)
    .sort((a, b) => a.order - b.order);

  const calendarSelectedDay =
    calendarSelectedDayIndex !== null ? days[calendarSelectedDayIndex] : null;
  const calendarDayItems = (calendarSelectedDay?.items ?? []).filter(
    (i) => i.type !== "accommodation"
  );

  const renderMonthCalendar = () => {
    if (!trip.startDate || !trip.endDate) return null;
    const tripStart = new Date(trip.startDate);
    const tripEnd = new Date(trip.endDate);

    const months: { year: number; month: number }[] = [];
    const cur = new Date(tripStart.getFullYear(), tripStart.getMonth(), 1);
    const endMonth = new Date(tripEnd.getFullYear(), tripEnd.getMonth(), 1);
    while (cur <= endMonth) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth() });
      cur.setMonth(cur.getMonth() + 1);
    }

    return months.map(({ year, month }) => {
      const lastDay = new Date(year, month + 1, 0);
      const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

      const cells: (number | null)[] = [];
      for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
      for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
      while (cells.length % 7 !== 0) cells.push(null);

      const weeks: (number | null)[][] = [];
      for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

      return (
        <View key={`${year}-${month}`} style={styles.calendarMonth}>
          <Text style={styles.calendarMonthLabel}>
            {FRENCH_MONTH_NAMES[month]} {year}
          </Text>
          <View style={styles.calendarDayNamesRow}>
            {FRENCH_DAY_NAMES.map((n) => (
              <Text key={n} style={styles.calendarDayName}>
                {n}
              </Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.calendarWeekRow}>
              {week.map((dayNum, di) => {
                if (!dayNum) return <View key={di} style={styles.calendarDayCell} />;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const dayIndex = days.findIndex((d) => d.date?.startsWith(dateStr));
                const isTripDay = dayIndex !== -1;
                const hasItems = isTripDay && (days[dayIndex].items ?? []).length > 0;
                const isSelected = dayIndex === calendarSelectedDayIndex;
                return (
                  <Pressable
                    key={di}
                    style={[
                      styles.calendarDayCell,
                      isTripDay && styles.calendarTripDay,
                      isSelected && styles.calendarSelectedDay,
                    ]}
                    onPress={() =>
                      isTripDay && setCalendarSelectedDayIndex(isSelected ? null : dayIndex)
                    }
                    disabled={!isTripDay}
                  >
                    <Text
                      style={[
                        styles.calendarDayNum,
                        !isTripDay && styles.calendarDayNumDisabled,
                        isSelected && styles.calendarDayNumSelected,
                      ]}
                    >
                      {dayNum}
                    </Text>
                    {hasItems && !isSelected && <View style={styles.calendarDot} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      );
    });
  };

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
        <View style={styles.tripHeader}>
          <View style={styles.headerRow}>
            {trip.emoji ? <Text style={styles.headerEmoji}>{trip.emoji}</Text> : null}
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

        {/* Sélecteur de vue — au-dessus du carrousel */}
        <View style={styles.viewToggle}>
          {(["timeline", "calendar", "organize"] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleBtnText, viewMode === mode && styles.toggleBtnTextActive]}>
                {mode === "timeline" ? "Jours" : mode === "calendar" ? "Calendrier" : "Idées"}
              </Text>
              {mode === "organize" && (trip.items ?? []).length > 0 && viewMode !== "organize" && (
                <View style={styles.ideaBadge}>
                  <Text style={styles.ideaBadgeText}>{(trip.items ?? []).length}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Carrousel de jours — uniquement en vue timeline */}
        {viewMode === "timeline" && (
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
                  <Text style={[styles.dayPillName, isActive && styles.dayPillNameActive]}>
                    {dayName}
                  </Text>
                  <Text style={[styles.dayPillNum, isActive && styles.dayPillNumActive]}>
                    {dayNum}
                  </Text>
                  {hasItems && !isActive && <View style={styles.dayDot} />}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Hébergement actif — uniquement en vue timeline */}
        {viewMode === "timeline" && uniqueAccommodations.length > 0 && (
          <View style={styles.accommodationSection}>
            {uniqueAccommodations.map((acc) => (
              <AccommodationCard
                key={acc.id}
                item={acc}
                onPress={() => router.push(`/trip/edit-item?itemId=${acc.id}`)}
              />
            ))}
          </View>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.timelineScroll}
          contentContainerStyle={styles.timelineContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!scrollLocked}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.rose} />
          }
        >
          {/* TIMELINE : grille horaire + items non planifiés */}
          {viewMode === "timeline" && (
            <>
              {scheduledItems.length === 0 && unscheduledItems.length === 0 && (
                <Text style={styles.emptyText}>Aucun événement pour ce jour</Text>
              )}
              <View
                style={styles.timelineGrid}
                onTouchStart={(e) => {
                  touchStartTime.current = Date.now();
                  touchStartY.current = e.nativeEvent.locationY;
                }}
                {...panResponder.panHandlers}
              >
                {HOURS.map((hour) => (
                  <View
                    key={hour}
                    style={[styles.hourRow, { top: (hour - START_HOUR) * HOUR_HEIGHT }]}
                    pointerEvents="none"
                  >
                    <Text style={styles.hourLabel}>{String(hour).padStart(2, "0")}:00</Text>
                    <View style={styles.hourSlot}>
                      <View style={styles.hourLine} />
                    </View>
                  </View>
                ))}

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
                      onPress={() => router.push(`/trip/edit-item?itemId=${item.id}`)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  );
                })}

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
                      style={[styles.travelContainer, { top: gapTop, height: gapHeight }]}
                    >
                      <TravelIndicator
                        originLocation={prev.location}
                        destinationLocation={item.location}
                      />
                    </View>
                  );
                })}

                <View style={{ height: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT + 40 }} />
              </View>

              {unscheduledItems.length > 0 && (
                <View style={styles.unscheduledBelowGrid}>
                  <Text style={styles.unscheduledTitle}>Non planifié</Text>
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
                    onPressItem={(item) => router.push(`/trip/edit-item?itemId=${item.id}`)}
                    onDeleteItem={(item) => deleteItem(item.id)}
                    onDragStateChange={setScrollLocked}
                  />
                </View>
              )}
            </>
          )}

          {/* CALENDRIER : vue mensuelle */}
          {viewMode === "calendar" && (
            <View style={styles.calendarContainer}>
              {renderMonthCalendar()}

              {calendarSelectedDay && (
                <View style={styles.calendarSelectedPanel}>
                  <Text style={styles.calendarSelectedPanelTitle}>
                    {formatDayLabel(calendarSelectedDay.date).dayName}{" "}
                    {formatDayLabel(calendarSelectedDay.date).dayNum}
                  </Text>
                  {calendarDayItems.length === 0 ? (
                    <Text style={styles.calendarEmptyDay}>Aucun événement</Text>
                  ) : (
                    <View style={styles.calendarDayItemsList}>
                      {calendarDayItems.map((item) => (
                        <TimelineBlock
                          key={item.id}
                          item={item}
                          onPress={() => router.push(`/trip/edit-item?itemId=${item.id}`)}
                          onDelete={() => deleteItem(item.id)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* IDÉES : items non planifiés du voyage */}
          {viewMode === "organize" && (
            <View style={styles.organizeContainer}>
              <View style={styles.organizeHeader}>
                <View>
                  <Text style={styles.organizeTitle}>Idées non planifiées</Text>
                  <Text style={styles.organizeSubtitle}>
                    {(trip.items ?? []).length === 0
                      ? "Aucune idée pour l'instant"
                      : `${(trip.items ?? []).length} idée${(trip.items ?? []).length > 1 ? "s" : ""} à placer`}
                  </Text>
                </View>
                {(trip.items ?? []).length > 0 && days.length > 0 && (
                  <Pressable
                    onPress={() => {
                      const plan = distributeIdeas(trip.items ?? [], days);
                      setDistributionPlan(plan);
                      sheetTranslateY.value = 600;
                      setDistributionModal(true);
                    }}
                    style={styles.distributeBtn}
                  >
                    <Shuffle size={16} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.distributeBtnText}>Répartir</Text>
                  </Pressable>
                )}
              </View>

              {(trip.items ?? []).length === 0 ? (
                <View style={styles.organizeEmpty}>
                  <Text style={styles.organizeEmptyEmoji}>💡</Text>
                  <Text style={styles.organizeEmptyText}>
                    Ajoute des idées d'activités, hébergements ou transports sans te soucier des
                    dates. Tu pourras les placer sur les jours de ton voyage ensuite.
                  </Text>
                </View>
              ) : (
                <View style={styles.ideaList}>
                  {(trip.items ?? []).map((idea) => (
                    <TimelineBlock
                      key={idea.id}
                      item={idea}
                      onPress={() => router.push(`/trip/edit-item?itemId=${idea.id}`)}
                      onDelete={() => deleteItem(idea.id, trip.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {(viewMode === "organize" || (viewMode === "timeline" && !!currentDay)) && (
          <AnimatedPressable
            onPress={() => {
              if (viewMode === "organize") {
                router.push(`/trip/add-item?tripId=${trip.id}`);
              } else if (currentDay) {
                router.push(`/trip/add-item?dayId=${currentDay.id}`);
              }
            }}
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
        <LoadingOverlay visible={isLoading} />

        <Modal
          visible={distributionModal}
          transparent
          animationType="none"
          onRequestClose={closeDistributionModal}
        >
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalSheet, sheetAnimStyle]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Répartition proposée</Text>
                <Pressable onPress={closeDistributionModal} hitSlop={12}>
                  <X size={22} color={colors.black} />
                </Pressable>
              </View>
              <Text style={styles.modalSubtitle}>
                Voici comment les idées seraient réparties sur tes jours de voyage.
              </Text>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {days.map((day) => {
                  const assigned = distributionPlan
                    .filter((a) => a.dayId === day.id)
                    .map((a) => (trip.items ?? []).find((i) => i.id === a.itemId))
                    .filter(Boolean) as Item[];
                  if (assigned.length === 0) return null;
                  const { dayName, dayNum } = formatDayLabel(day.date);
                  return (
                    <View key={day.id} style={styles.modalDayGroup}>
                      <Text style={styles.modalDayLabel}>
                        {dayName} {dayNum}
                      </Text>
                      {assigned.map((idea) => {
                        const cfg = getItemTypeConfig(idea.type);
                        const ModalIcon = cfg.icon;
                        return (
                          <View key={idea.id} style={styles.modalIdeaRow}>
                            <ModalIcon size={18} color={cfg.color} />
                            <Text style={styles.modalIdeaTitle} numberOfLines={1}>
                              {idea.title}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </ScrollView>
              <View style={styles.modalFooter}>
                <Pressable onPress={closeDistributionModal} style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    closeDistributionModal();
                    setIsLoading(true);
                    try {
                      await Promise.all(
                        distributionPlan.map(({ itemId, dayId }) =>
                          assignIdeaToDay(itemId, dayId, trip.id)
                        )
                      );
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  style={styles.modalConfirmBtn}
                >
                  <Text style={styles.modalConfirmText}>Confirmer</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.grayLight },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.grayLight,
    },
    loadingText: { fontFamily: fonts.medium, fontSize: fontSize.md, color: c.gray },
    tripHeader: {
      backgroundColor: c.white,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomLeftRadius: radius.xxl,
      borderBottomRightRadius: radius.xxl,
      ...shadow.sm,
    },
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
    headerEmoji: { fontSize: 36, marginRight: spacing.md },
    headerInfo: { flex: 1 },
    destination: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.xxs,
      color: c.rose,
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 2,
    },
    title: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: c.black, letterSpacing: -0.5 },
    dates: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: c.gray },
    deleteBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
    },
    deleteBtnText: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: c.red },
    viewToggle: {
      flexDirection: "row",
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      backgroundColor: c.grayLight,
      borderRadius: radius.full,
      padding: 3,
      borderWidth: 1,
      borderColor: c.grayBorder,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      alignItems: "center",
    },
    toggleBtnActive: { backgroundColor: c.white, ...shadow.sm },
    toggleBtnText: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: c.grayMuted },
    toggleBtnTextActive: { color: c.black },
    dayScroll: { maxHeight: 90, marginTop: spacing.md },
    dayScrollContent: { paddingHorizontal: spacing.lg, gap: DAY_GAP, alignItems: "center" },
    dayPill: {
      height: 72,
      borderRadius: radius.xl,
      backgroundColor: c.white,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.grayBorder,
    },
    dayPillActive: {
      backgroundColor: c.rose,
      borderColor: c.rose,
      ...shadow.md,
      shadowColor: c.rose,
    },
    dayPillName: {
      fontFamily: fonts.medium,
      fontSize: fontSize.xxs,
      color: c.grayMuted,
      textTransform: "capitalize",
      marginBottom: 2,
    },
    dayPillNameActive: { color: "rgba(255,255,255,0.7)" },
    dayPillNum: {
      fontFamily: fonts.bold,
      fontSize: fontSize.xl,
      color: c.black,
      letterSpacing: -0.5,
    },
    dayPillNumActive: { color: "#FFFFFF" },
    dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.rose, marginTop: 3 },
    accommodationSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    timelineScroll: { flex: 1, marginTop: spacing.sm },
    timelineContent: { paddingBottom: 100 },
    timelineGrid: { position: "relative", paddingTop: 8, marginTop: spacing.md },
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
      color: c.grayMuted,
      textAlign: "right",
      paddingRight: spacing.md,
      marginTop: -6,
    },
    hourSlot: { flex: 1, height: HOUR_HEIGHT },
    hourLine: { height: 1, backgroundColor: c.grayBorder },
    selectionOverlay: {
      position: "absolute",
      left: TIMELINE_LEFT + spacing.xs,
      right: spacing.lg,
      backgroundColor: c.roseMuted,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: c.rose,
      borderStyle: "dashed",
      zIndex: 10,
      justifyContent: "center",
      alignItems: "center",
      minHeight: 36,
    },
    selectionContent: { alignItems: "center", width: "100%" },
    selectionHint: {
      fontFamily: fonts.medium,
      fontSize: fontSize.xs,
      color: c.rose,
      textAlign: "center" as const,
      padding: 0,
      width: "100%",
    },
    emptyText: {
      fontFamily: fonts.regular,
      fontSize: fontSize.sm,
      color: c.grayMuted,
      textAlign: "center",
      marginTop: spacing.xxl,
    },
    unscheduledBelowGrid: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    unscheduledTitle: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.sm,
      color: c.grayMuted,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: spacing.md,
    },
    travelContainer: {
      position: "absolute",
      left: TIMELINE_LEFT + spacing.sm,
      right: spacing.lg,
      justifyContent: "center",
      zIndex: 1,
    },
    // Calendrier mensuel / hebdomadaire
    calendarContainer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    calendarMonth: { marginBottom: spacing.lg },
    calendarMonthLabel: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.md,
      color: c.black,
      textTransform: "capitalize",
      marginBottom: spacing.sm,
    },
    calendarDayNamesRow: { flexDirection: "row", marginBottom: spacing.xs },
    calendarDayName: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.medium,
      fontSize: fontSize.xs,
      color: c.grayMuted,
    },
    calendarWeekRow: { flexDirection: "row", marginBottom: 4 },
    calendarDayCell: {
      flex: 1,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      margin: 2,
    },
    calendarTripDay: { backgroundColor: c.roseMuted },
    calendarSelectedDay: { backgroundColor: c.rose },
    calendarDayNum: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: c.black },
    calendarDayNumDisabled: { fontFamily: fonts.regular, color: c.grayMuted },
    calendarDayNumSelected: { color: "#FFFFFF" },
    calendarDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.rose,
      marginTop: 2,
    },
    calendarSelectedPanel: {
      marginTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: c.grayBorder,
      paddingTop: spacing.lg,
    },
    calendarSelectedPanelTitle: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.md,
      color: c.black,
      textTransform: "capitalize",
      marginBottom: spacing.md,
    },
    calendarEmptyDay: {
      fontFamily: fonts.regular,
      fontSize: fontSize.sm,
      color: c.grayMuted,
      textAlign: "center",
      marginTop: spacing.md,
    },
    calendarDayItemsList: { gap: spacing.sm },
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
    ideaBadge: {
      position: "absolute",
      top: 2,
      right: 6,
      minWidth: 16,
      height: 16,
      borderRadius: radius.full,
      backgroundColor: c.rose,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    ideaBadgeText: { fontFamily: fonts.bold, fontSize: 9, color: "#FFFFFF" },
    organizeContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    organizeHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.lg,
    },
    organizeTitle: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: c.black },
    organizeSubtitle: {
      fontFamily: fonts.regular,
      fontSize: fontSize.xs,
      color: c.grayMuted,
      marginTop: 2,
    },
    distributeBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: c.rose,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...shadow.sm,
      shadowColor: c.rose,
    },
    distributeBtnText: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: "#FFFFFF" },
    organizeEmpty: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
    organizeEmptyEmoji: { fontSize: 48, marginBottom: spacing.lg },
    organizeEmptyText: {
      fontFamily: fonts.regular,
      fontSize: fontSize.sm,
      color: c.grayMuted,
      textAlign: "center",
      lineHeight: 22,
    },
    ideaList: { gap: spacing.sm },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalSheet: {
      backgroundColor: c.white,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingBottom: 40,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    modalTitle: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: c.black },
    modalSubtitle: {
      fontFamily: fonts.regular,
      fontSize: fontSize.sm,
      color: c.grayMuted,
      marginBottom: spacing.lg,
    },
    modalScroll: { maxHeight: 340 },
    modalDayGroup: { marginBottom: spacing.lg },
    modalDayLabel: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.sm,
      color: c.rose,
      textTransform: "capitalize",
      marginBottom: spacing.sm,
    },
    modalIdeaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: c.grayLight,
    },
    modalIdeaTitle: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: c.black, flex: 1 },
    modalFooter: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: radius.full,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: c.grayBorder,
    },
    modalCancelText: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: c.black },
    modalConfirmBtn: {
      flex: 2,
      paddingVertical: 16,
      borderRadius: radius.full,
      alignItems: "center",
      backgroundColor: c.rose,
      ...shadow.md,
      shadowColor: c.rose,
    },
    modalConfirmText: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: "#FFFFFF" },
  });
