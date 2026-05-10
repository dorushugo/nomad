import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Sun, Moon, Smartphone } from "lucide-react-native";
import { useAuthStore } from "../../src/stores/authStore";
import { useTripStore } from "../../src/stores/tripStore";
import { useThemeStore, type ThemePreference } from "../../src/stores/themeStore";
import { useTheme } from "../../src/hooks/useTheme";
import { fonts, fontSize, spacing, radius, shadow } from "../../src/theme";
import type { ThemeColors } from "../../src/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const THEME_OPTIONS: { key: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { key: "light", label: "Clair", Icon: Sun },
  { key: "dark", label: "Sombre", Icon: Moon },
  { key: "system", label: "Auto", Icon: Smartphone },
];

function ThemeOptionButton({
  option,
  isActive,
  onPress,
  colors,
}: {
  option: (typeof THEME_OPTIONS)[number];
  isActive: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.94, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      style={[
        {
          flex: 1,
          alignItems: "center",
          paddingVertical: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: isActive ? colors.rose : "transparent",
          gap: spacing.xs,
        },
        animStyle,
      ]}
    >
      <option.Icon
        size={20}
        color={isActive ? "#FFFFFF" : colors.gray}
        strokeWidth={2}
      />
      <Text
        style={{
          fontFamily: isActive ? fonts.semiBold : fonts.medium,
          fontSize: fontSize.xs,
          color: isActive ? "#FFFFFF" : colors.gray,
        }}
      >
        {option.label}
      </Text>
    </AnimatedPressable>
  );
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const trips = useTripStore((s) => s.trips);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const { colors } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const totalItems = trips.reduce(
    (acc, t) => acc + t.days.reduce((a, d) => a + (d.items?.length || 0), 0),
    0
  );

  const destinations = new Set(trips.map((t) => t.destination.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: colors.grayLight }}>
      {/* Profile Header */}
      <View
        style={{
          backgroundColor: colors.white,
          alignItems: "center",
          paddingTop: 80,
          paddingBottom: spacing.xl,
          borderBottomLeftRadius: radius.xxl,
          borderBottomRightRadius: radius.xxl,
          ...shadow.md,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: radius.full,
            backgroundColor: colors.rose,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: fontSize.xxxl,
              color: "#FFFFFF",
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || "N"}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: fontSize.xl,
            color: colors.black,
            letterSpacing: -0.3,
          }}
        >
          {user?.name}
        </Text>
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: fontSize.sm,
            color: colors.gray,
            marginTop: spacing.xxs,
          }}
        >
          {user?.email}
        </Text>
      </View>

      {/* Stats */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.white,
          marginHorizontal: spacing.lg,
          marginTop: spacing.lg,
          borderRadius: radius.xl,
          paddingVertical: spacing.lg,
          ...shadow.sm,
        }}
      >
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: fontSize.xxl,
              color: colors.rose,
              letterSpacing: -0.5,
            }}
          >
            {trips.length}
          </Text>
          <Text
            style={{
              fontFamily: fonts.medium,
              fontSize: fontSize.xs,
              color: colors.gray,
              marginTop: spacing.xxs,
            }}
          >
            Voyage{trips.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.grayBorder }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: fontSize.xxl,
              color: colors.rose,
              letterSpacing: -0.5,
            }}
          >
            {destinations.size}
          </Text>
          <Text
            style={{
              fontFamily: fonts.medium,
              fontSize: fontSize.xs,
              color: colors.gray,
              marginTop: spacing.xxs,
            }}
          >
            Destination{destinations.size !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.grayBorder }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: fontSize.xxl,
              color: colors.rose,
              letterSpacing: -0.5,
            }}
          >
            {totalItems}
          </Text>
          <Text
            style={{
              fontFamily: fonts.medium,
              fontSize: fontSize.xs,
              color: colors.gray,
              marginTop: spacing.xxs,
            }}
          >
            Activité{totalItems !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Theme selector */}
      <View
        style={{
          marginHorizontal: spacing.lg,
          marginTop: spacing.lg,
          backgroundColor: colors.white,
          borderRadius: radius.xl,
          padding: spacing.md,
          ...shadow.sm,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.semiBold,
            fontSize: fontSize.xs,
            color: colors.gray,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: spacing.md,
            paddingHorizontal: spacing.xs,
          }}
        >
          Apparence
        </Text>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.grayLight,
            borderRadius: radius.lg,
            padding: 4,
            gap: 4,
          }}
        >
          {THEME_OPTIONS.map((option) => (
            <ThemeOptionButton
              key={option.key}
              option={option}
              isActive={preference === option.key}
              onPress={() => setPreference(option.key)}
              colors={colors}
            />
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
        <Pressable
          onPress={handleLogout}
          style={{
            backgroundColor: colors.white,
            paddingVertical: spacing.md,
            borderRadius: radius.lg,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.grayBorder,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.semiBold,
              fontSize: fontSize.md,
              color: colors.red,
            }}
          >
            Se déconnecter
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
