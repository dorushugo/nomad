import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, fontSize, spacing, radius } from "../../src/theme";

export default function MapScreen() {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
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
    backgroundColor: colors.roseMuted,
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
    color: colors.black,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    color: colors.rose,
    marginBottom: spacing.md,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.gray,
    textAlign: "center",
    lineHeight: 22,
  },
});
