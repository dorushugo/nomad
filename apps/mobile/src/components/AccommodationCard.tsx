import { Hotel } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useTheme } from "../hooks/useTheme";
import type { Item } from "../stores/tripStore";
import { fontSize, fonts, radius, shadow, spacing, withOpacity } from "../theme";
import type { ThemeColors } from "../theme";

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
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dateLabel =
    item.startDate && item.endDate
      ? `${formatDisplay(item.startDate)} → ${formatDisplay(item.endDate)}`
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
          <Hotel size={18} color={colors.blue} />
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
          {dateLabel ? <Text style={styles.dates}>{dateLabel}</Text> : null}
        </View>
        {item.price != null && item.price > 0 && <Text style={styles.price}>{item.price}€</Text>}
      </View>
    </AnimatedPressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: withOpacity(c.blue, 0.06),
      borderRadius: radius.xl,
      borderLeftWidth: 4,
      borderLeftColor: c.blue,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadow.sm,
    },
    row: { flexDirection: "row", alignItems: "center" },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: withOpacity(c.blue, 0.08),
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    content: { flex: 1 },
    title: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.md,
      color: c.black,
      letterSpacing: -0.2,
    },
    location: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: c.gray, marginTop: 2 },
    dates: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: c.blue, marginTop: 4 },
    price: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.sm,
      color: c.darkGray,
      marginLeft: spacing.sm,
    },
  });
