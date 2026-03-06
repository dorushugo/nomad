import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";
import { useTripStore } from "../../src/stores/tripStore";
import { colors, fonts, fontSize, spacing, radius, shadow } from "../../src/theme";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const trips = useTripStore((s) => s.trips);

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
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || "N"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{trips.length}</Text>
          <Text style={styles.statLabel}>
            Voyage{trips.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{destinations.size}</Text>
          <Text style={styles.statLabel}>
            Destination{destinations.size !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalItems}</Text>
          <Text style={styles.statLabel}>
            Activité{totalItems !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  header: {
    backgroundColor: colors.white,
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    ...shadow.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.rose,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xxxl,
    color: colors.white,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.black,
    letterSpacing: -0.3,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.gray,
    marginTop: spacing.xxs,
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    ...shadow.sm,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xxl,
    color: colors.rose,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.gray,
    marginTop: spacing.xxs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.grayBorder,
  },
  // Actions
  actions: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  logoutButton: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.grayBorder,
  },
  logoutText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    color: colors.red,
  },
});
