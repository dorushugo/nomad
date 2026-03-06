import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Car, Footprints } from "lucide-react-native";
import { getTransitDuration } from "../utils/directions";
import { colors, fonts, fontSize, spacing, radius } from "../theme";

interface TravelIndicatorProps {
  originLocation: string;
  destinationLocation: string;
}

export function TravelIndicator({
  originLocation,
  destinationLocation,
}: TravelIndicatorProps) {
  const [duration, setDuration] = useState<string | null>(null);
  const [mode, setMode] = useState<"driving" | "walking">("driving");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getTransitDuration(originLocation, destinationLocation).then((result) => {
      if (cancelled) return;
      if (result) {
        setDuration(result.duration);
        setMode(result.mode);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [originLocation, destinationLocation]);

  if (!loading && !duration) return null;

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.badge}>
        {loading ? (
          <View style={styles.skeleton} />
        ) : (
          <>
            {mode === "walking" ? (
              <Footprints size={12} color={colors.gray} />
            ) : (
              <Car size={12} color={colors.gray} />
            )}
            <Text style={styles.text}>{duration}</Text>
          </>
        )}
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.grayBorder,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.grayBorder,
    minWidth: 60,
    justifyContent: "center",
    minHeight: 24,
  },
  skeleton: {
    width: 40,
    height: 10,
    borderRadius: radius.xs,
    backgroundColor: colors.grayBorder,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xxs,
    color: colors.gray,
  },
});
