import { View, Text, StyleSheet } from "react-native";
import { fonts, fontSize, spacing, radius } from "../../src/theme";
import { useTheme } from "../../src/hooks/useTheme";
import type { ThemeColors } from "../../src/theme";

export default function MapScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.emoji}>🗺️</Text>
        </View>
        <Text style={styles.title}>Carte</Text>
        <Text style={styles.subtitle}>Bientôt disponible</Text>
        <Text style={styles.description}>
          Retrouve tous tes voyages et lieux visités sur une carte interactive.
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.grayLight,
      justifyContent: "center",
      alignItems: "center",
    },
    content: {
      alignItems: "center",
      paddingHorizontal: spacing.xl,
    },
    iconContainer: {
      width: 96,
      height: 96,
      borderRadius: radius.full,
      backgroundColor: c.roseMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    emoji: {
      fontSize: 42,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: fontSize.xxl,
      color: c.black,
      marginBottom: spacing.xs,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.md,
      color: c.rose,
      marginBottom: spacing.md,
    },
    description: {
      fontFamily: fonts.regular,
      fontSize: fontSize.sm,
      color: c.gray,
      textAlign: "center",
      lineHeight: 22,
    },
  });
