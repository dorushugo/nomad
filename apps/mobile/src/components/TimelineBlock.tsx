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
import { Trash2 } from "lucide-react-native";
import { Item } from "../stores/tripStore";
import { getTransportModeEmoji } from "../utils/transportModes";
import { colors, fonts, fontSize, radius, spacing, shadow } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TYPE_CONFIG = {
  activity: { emoji: "📍", accent: colors.rose, bg: colors.roseLight },
  accommodation: { emoji: "🏨", accent: colors.blue, bg: "rgba(66, 139, 255, 0.08)" },
  transport: { emoji: "✈️", accent: colors.orange, bg: "rgba(224, 121, 18, 0.08)" },
  note: { emoji: "📝", accent: colors.gray, bg: colors.grayLight },
};

interface TimelineBlockProps {
  item: Item;
  onPress: () => void;
  onDelete?: () => void;
  isDragging?: boolean;
}

function renderRightActions() {
  return (
    <View style={styles.deleteAction}>
      <Trash2 size={22} color={colors.white} />
      <Text style={styles.deleteText}>Supprimer</Text>
    </View>
  );
}

export function TimelineBlock({ item, onPress, onDelete, isDragging }: TimelineBlockProps) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.activity;
  const emoji = item.type === "transport"
    ? getTransportModeEmoji(item.transportMode)
    : config.emoji;
  const scale = useSharedValue(1);
  const swipeableRef = useRef<Swipeable>(null);

  // Exit animation values
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
    // Measure current height, then animate out
    const doDelete = () => {
      onDelete?.();
    };

    // Slide left + fade out
    translateX.value = withTiming(-400, { duration: 250, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 250 });

    // Collapse height after slide
    if (rowHeight.value != null) {
      animatedHeight.value = rowHeight.value;
      animatedHeight.value = withTiming(0, {
        duration: 200,
        easing: Easing.inOut(Easing.cubic),
      }, (finished) => {
        if (finished) runOnJS(doDelete)();
      });
    } else {
      // Fallback: just delete after slide
      opacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) runOnJS(doDelete)();
      });
    }
  };

  const handleSwipeOpen = () => {
    Alert.alert(
      "Supprimer cet élément ?",
      item.title,
      [
        {
          text: "Annuler",
          style: "cancel",
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            swipeableRef.current?.close();
            handleConfirmDelete();
          },
        },
      ]
    );
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
        { borderLeftColor: config.accent },
        isDragging && styles.blockDragging,
        pressStyle,
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
          <Text style={styles.icon}>{emoji}</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.topRow}>
            {item.startTime ? (
              <Text style={[styles.time, { color: config.accent }]}>
                {item.startTime}
                {item.endTime ? ` - ${item.endTime}` : ""}
              </Text>
            ) : (
              <Text style={styles.noTime}>Pas d'horaire</Text>
            )}
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {item.location ? (
            <Text style={styles.location} numberOfLines={1}>
              {item.location}
            </Text>
          ) : null}
        </View>
        {item.price != null && item.price > 0 && (
          <Text style={styles.price}>{item.price}€</Text>
        )}
      </View>
    </AnimatedPressable>
  );

  if (!onDelete) return content;

  return (
    <Animated.View
      style={exitStyle}
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
      >
        {content}
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.rose,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  blockDragging: {
    ...shadow.lg,
    opacity: 0.9,
    transform: [{ scale: 1.03 }],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  time: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: 0.3,
  },
  noTime: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.grayMuted,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    color: colors.black,
    letterSpacing: -0.2,
  },
  location: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.gray,
    marginTop: 2,
  },
  price: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
    color: colors.darkGray,
    marginLeft: spacing.sm,
  },
  deleteAction: {
    backgroundColor: colors.red,
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
    color: colors.white,
    marginTop: 4,
  },
});
