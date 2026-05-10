import { useRef } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Swipeable } from "react-native-gesture-handler";
import { Trash2, MapPin, Hotel, Plane, FileText } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Item } from "../stores/tripStore";
import { getTransportModeIcon } from "../utils/transportModes";
import { fonts, fontSize, radius, spacing, shadow, withOpacity } from "../theme";
import { useTheme } from "../hooks/useTheme";
import type { ThemeColors } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getTypeConfig(
  c: ThemeColors,
  type: string
): { icon: LucideIcon; accent: string; bg: string } {
  const map: Record<string, { icon: LucideIcon; accent: string; bg: string }> = {
    activity: { icon: MapPin, accent: c.rose, bg: c.roseLight },
    accommodation: { icon: Hotel, accent: c.blue, bg: withOpacity(c.blue, 0.08) },
    transport: { icon: Plane, accent: c.orange, bg: withOpacity(c.orange, 0.08) },
    note: { icon: FileText, accent: c.gray, bg: c.grayLight },
  };
  return map[type] ?? map.activity;
}

interface TimelineBlockProps {
  item: Item;
  onPress: () => void;
  onDelete?: () => void;
  isDragging?: boolean;
  fill?: boolean;
}

function renderRightActions() {
  return (
    <View style={styles.deleteAction}>
      <Trash2 size={22} color="#FFFFFF" />
      <Text style={styles.deleteText}>Supprimer</Text>
    </View>
  );
}

export function TimelineBlock({ item, onPress, onDelete, isDragging, fill }: TimelineBlockProps) {
  const { colors } = useTheme();
  const config = getTypeConfig(colors, item.type);
  const IconComponent =
    item.type === "transport" ? getTransportModeIcon(item.transportMode) : config.icon;
  const scale = useSharedValue(1);
  const swipeableRef = useRef<Swipeable>(null);

  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue<number | null>(null);
  const animatedHeight = useSharedValue<number | null>(null);
  const opacity = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const exitStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
    height: animatedHeight.value != null ? animatedHeight.value : undefined,
    overflow: "hidden" as const,
  }));

  const handleConfirmDelete = () => {
    const doDelete = () => {
      onDelete?.();
    };
    translateX.value = withTiming(-400, { duration: 250, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 250 });
    if (rowHeight.value != null) {
      animatedHeight.value = rowHeight.value;
      animatedHeight.value = withTiming(
        0,
        { duration: 200, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(doDelete)();
        }
      );
    } else {
      opacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) runOnJS(doDelete)();
      });
    }
  };

  const handleSwipeOpen = () => {
    Alert.alert("Supprimer cet élément ?", item.title, [
      { text: "Annuler", style: "cancel", onPress: () => swipeableRef.current?.close() },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          swipeableRef.current?.close();
          handleConfirmDelete();
        },
      },
    ]);
  };

  const content = (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[
        styles.block,
        {
          backgroundColor: colors.white,
          borderLeftColor: config.accent,
        },
        fill && { height: "100%", marginBottom: 0 },
        isDragging && styles.blockDragging,
        pressStyle,
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
          <IconComponent size={18} color={config.accent} />
        </View>
        <View style={styles.content}>
          <View style={styles.topRow}>
            {item.startTime ? (
              <Text style={[styles.time, { color: config.accent }]}>
                {item.startTime}
                {item.endTime ? ` - ${item.endTime}` : ""}
              </Text>
            ) : (
              <Text style={[styles.noTime, { color: colors.grayMuted }]}>Pas d'horaire</Text>
            )}
          </View>
          <Text style={[styles.title, { color: colors.black }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.location ? (
            <Text style={[styles.location, { color: colors.gray }]} numberOfLines={1}>
              {item.location}
            </Text>
          ) : null}
        </View>
        {item.price != null && item.price > 0 && (
          <Text style={[styles.price, { color: colors.darkGray }]}>{item.price}€</Text>
        )}
      </View>
    </AnimatedPressable>
  );

  if (!onDelete) return content;

  return (
    <Animated.View
      style={[exitStyle, fill && { height: "100%" }]}
      onLayout={(e) => {
        if (rowHeight.value == null) {
          rowHeight.value = e.nativeEvent.layout.height;
        }
      }}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        onSwipeableWillOpen={handleSwipeOpen}
        overshootRight={false}
        rightThreshold={80}
        containerStyle={fill ? { height: "100%" } : undefined}
      >
        {content}
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  blockDragging: {
    ...shadow.lg,
    opacity: 0.9,
    transform: [{ scale: 1.03 }],
  },
  row: { flexDirection: "row", alignItems: "center" },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  content: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  time: { fontFamily: fonts.semiBold, fontSize: fontSize.xs, letterSpacing: 0.3 },
  noTime: { fontFamily: fonts.regular, fontSize: fontSize.xs },
  title: { fontFamily: fonts.semiBold, fontSize: fontSize.md, letterSpacing: -0.2 },
  location: { fontFamily: fonts.regular, fontSize: fontSize.xs, marginTop: 2 },
  price: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, marginLeft: spacing.sm },
  deleteAction: {
    backgroundColor: "#C13515",
    borderRadius: radius.lg,
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  deleteText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xxs,
    color: "#FFFFFF",
    marginTop: 4,
  },
});
