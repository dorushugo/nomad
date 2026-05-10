import { useState } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../hooks/useTheme";
import { fontSize, fonts, radius, spacing } from "../theme";

const AnimatedView = Animated.createAnimatedComponent(View);

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const borderProgress = useSharedValue(0);
  const { colors } = useTheme();

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    borderColor:
      borderProgress.value > 0.5
        ? error
          ? colors.red
          : colors.black
        : error
          ? colors.red
          : colors.grayBorder,
  }));

  const handleFocus = () => {
    setFocused(true);
    borderProgress.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
  };

  const handleBlur = () => {
    setFocused(false);
    borderProgress.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
  };

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: colors.darkGray }]}>{label}</Text>}
      <AnimatedView
        style={[
          styles.container,
          { backgroundColor: colors.white, borderColor: colors.grayBorder },
          containerAnimatedStyle,
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.black }, style]}
          placeholderTextColor={colors.grayMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={colors.rose}
          {...props}
        />
      </AnimatedView>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md + 4,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  container: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  input: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: "#C13515",
    marginTop: spacing.xs + 2,
    marginLeft: spacing.xs,
  },
});
