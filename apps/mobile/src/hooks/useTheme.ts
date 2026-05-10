import { useColorScheme } from "react-native";
import { useThemeStore } from "../stores/themeStore";
import { darkColors, lightColors } from "../theme/colors";

export function useTheme() {
  const preference = useThemeStore((s) => s.preference);
  const systemScheme = useColorScheme();
  const isDark = preference === "dark" || (preference === "system" && systemScheme === "dark");
  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
    preference,
  };
}
