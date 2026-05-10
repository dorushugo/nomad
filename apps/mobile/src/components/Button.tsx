import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useTheme } from "../hooks/useTheme";
import { fontSize, fonts, radius, spacing } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.8 };

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  isLoading,
  disabled,
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const { colors } = useTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || isLoading;

  const variantStyle: ViewStyle = {
    primary: { backgroundColor: colors.rose },
    secondary: { backgroundColor: colors.black },
    outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.grayBorder },
    ghost: { backgroundColor: "transparent" },
  }[variant];

  const textColor = {
    primary: "#FFFFFF",
    secondary: colors.white,
    outline: colors.black,
    ghost: colors.rose,
  }[variant];

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, SPRING_CONFIG);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
      disabled={isDisabled}
      style={[
        styles.base,
        sizeStyles[size],
        variantStyle,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : colors.rose} size="small" />
      ) : (
        <Text style={[styles.text, textSizeStyles[size], { color: textColor }]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontFamily: fonts.semiBold,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    minHeight: 36,
  },
  md: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    minHeight: 46,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    minHeight: 56,
  },
});

const textSizeStyles = StyleSheet.create({
  sm: { fontSize: fontSize.sm },
  md: { fontSize: fontSize.md },
  lg: { fontSize: fontSize.md },
});
