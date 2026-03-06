import { useState } from "react";
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors, fonts, fontSize, radius, spacing } from "../theme";

const AnimatedView = Animated.createAnimatedComponent(View);

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const borderProgress = useSharedValue(0);

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
    borderProgress.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
  };

  const handleBlur = () => {
    setFocused(false);
    borderProgress.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
  };

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <AnimatedView style={[styles.container, containerAnimatedStyle]}>
        <TextInput
          style={[styles.input, style]}
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
    color: colors.darkGray,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  container: {
    borderWidth: 1.5,
    borderColor: colors.grayBorder,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  input: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.red,
    marginTop: spacing.xs + 2,
    marginLeft: spacing.xs,
  },
});
