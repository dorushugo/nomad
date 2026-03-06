import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Item } from "../stores/tripStore";
import { colors, fonts, fontSize, radius, spacing, shadow } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

interface AccommodationCardProps {
  item: Item;
  onPress: () => void;
}

export function AccommodationCard({ item, onPress }: AccommodationCardProps) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dateLabel =
    item.startDate && item.endDate
      ? `${formatDisplay(item.startDate)} \u2192 ${formatDisplay(item.endDate)}`
      : item.startDate
        ? formatDisplay(item.startDate)
        : null;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[styles.card, pressStyle]}
    >
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{"\uD83C\uDFE8"}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {item.location ? (
            <Text style={styles.location} numberOfLines={1}>
              {item.location}
            </Text>
          ) : null}
          {dateLabel ? (
            <Text style={styles.dates}>{dateLabel}</Text>
          ) : null}
        </View>
        {item.price != null && item.price > 0 && (
          <Text style={styles.price}>{item.price}\u20AC</Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(66, 139, 255, 0.04)",
    borderRadius: radius.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.blue,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "rgba(66, 139, 255, 0.08)",
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
  dates: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.blue,
    marginTop: 4,
  },
  price: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
    color: colors.darkGray,
    marginLeft: spacing.sm,
  },
});
