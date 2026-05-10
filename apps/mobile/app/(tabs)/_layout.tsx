import { Tabs } from "expo-router";
import { House, Luggage, Map, User } from "lucide-react-native";
import { fonts, fontSize } from "../../src/theme";
import { useTheme } from "../../src/hooks/useTheme";

const ICON_SIZE = 22;

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.grayBorder,
          height: 88,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: colors.rose,
        tabBarInactiveTintColor: colors.grayMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: fontSize.xxs,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color }) => (
            <House size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Mes Voyages",
          tabBarIcon: ({ color }) => (
            <Luggage size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Carte",
          tabBarIcon: ({ color }) => (
            <Map size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <User size={ICON_SIZE} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
