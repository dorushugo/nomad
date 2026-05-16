import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { MAX_VISIBLE_DAYS, formatDayLabel } from "../features/timeline";
import { useTheme } from "../hooks/useTheme";
import type { Day } from "../stores/tripStore";
import { fontSize, fonts, radius, shadow, spacing } from "../theme";
import type { ThemeColors } from "../theme";

const DAY_GAP = spacing.sm;

interface DayCarouselProps {
  days: Day[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
  getDayDot?: (day: Day) => boolean;
}

export function DayCarousel({ days, selectedDayIndex, onSelectDay, getDayDot }: DayCarouselProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const visibleDays = Math.min(days.length, MAX_VISIBLE_DAYS);
  const pillContainerWidth = screenWidth - 2 * spacing.lg;
  const pillWidth =
    visibleDays > 1
      ? (pillContainerWidth - DAY_GAP * (visibleDays - 1)) / visibleDays
      : pillContainerWidth;

  useEffect(() => {
    const offset = Math.max(
      0,
      spacing.lg + selectedDayIndex * (pillWidth + DAY_GAP) + pillWidth / 2 - screenWidth / 2
    );
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: offset, animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedDayIndex, pillWidth, screenWidth]);

  const styles = makeStyles(colors);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      {days.map((day, index) => {
        const { dayName, dayNum } = formatDayLabel(day.date);
        const isActive = index === selectedDayIndex;
        const showDot = getDayDot?.(day) ?? false;
        return (
          <Pressable
            key={day.id}
            onPress={() => onSelectDay(index)}
            style={[styles.pill, { width: pillWidth }, isActive && styles.pillActive]}
          >
            <Text style={[styles.pillName, isActive && styles.pillNameActive]}>{dayName}</Text>
            <Text style={[styles.pillNum, isActive && styles.pillNumActive]}>{dayNum}</Text>
            {showDot && !isActive && <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scroll: { maxHeight: 90, marginTop: spacing.md },
    scrollContent: { paddingHorizontal: spacing.lg, gap: DAY_GAP, alignItems: "center" },
    pill: {
      height: 72,
      borderRadius: radius.xl,
      backgroundColor: c.white,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.grayBorder,
    },
    pillActive: {
      backgroundColor: c.rose,
      borderColor: c.rose,
      ...shadow.md,
      shadowColor: c.rose,
    },
    pillName: {
      fontFamily: fonts.medium,
      fontSize: fontSize.xxs,
      color: c.grayMuted,
      textTransform: "capitalize",
      marginBottom: 2,
    },
    pillNameActive: { color: "rgba(255,255,255,0.7)" },
    pillNum: {
      fontFamily: fonts.bold,
      fontSize: fontSize.xl,
      color: c.black,
      letterSpacing: -0.5,
    },
    pillNumActive: { color: "#FFFFFF" },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.rose, marginTop: 3 },
  });
