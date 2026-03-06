import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { colors, fonts, fontSize, radius, spacing, shadow } from "../theme";
import { Item } from "../stores/tripStore";
import { getTransportModeEmoji } from "../utils/transportModes";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.8 };

const typeConfig = {
  activity: { emoji: "📍", label: "Activité", bg: colors.roseLight, accent: colors.rose },
  accommodation: { emoji: "🏨", label: "Hébergement", bg: "rgba(66, 139, 255, 0.08)", accent: colors.blue },
  transport: { emoji: "✈️", label: "Transport", bg: "rgba(224, 121, 18, 0.08)", accent: colors.orange },
  note: { emoji: "📝", label: "Note", bg: colors.grayLight, accent: colors.gray },
};

interface ItemCardProps {
  item: Item;
  onPress?: () => void;
}

export function ItemCard({ item, onPress }: ItemCardProps) {
  const config = typeConfig[item.type];
  const emoji = item.type === "transport"
    ? getTransportModeEmoji(item.transportMode)
    : config.emoji;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.type, { color: config.accent }]}>{config.label}</Text>
          {item.startTime && (
            <Text style={styles.time}>
              {item.startTime}
              {item.endTime ? ` - ${item.endTime}` : ""}
            </Text>
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>

        {(item.location || (item.price !== undefined && item.price !== null)) && (
          <View style={styles.bottomRow}>
            {item.location && (
              <Text style={styles.location} numberOfLines={1}>
                {item.location}
              </Text>
            )}
            {item.price !== undefined && item.price !== null && (
              <Text style={styles.price}>{item.price}€</Text>
            )}
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.grayBorder,
    ...shadow.sm,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  emoji: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  type: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xxs,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  time: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.grayMuted,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    color: colors.black,
    letterSpacing: -0.2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 3,
  },
  location: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.gray,
    flex: 1,
    marginRight: spacing.sm,
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: colors.rose,
  },
});
