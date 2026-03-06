import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { Link, router, Stack } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";
import { Button } from "../src/components/Button";
import { Input } from "../src/components/Input";
import { colors, fonts, fontSize, spacing, radius } from "../src/theme";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { register, isLoading } = useAuthStore();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Erreur", "Remplis tous les champs");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Erreur", "6 caractères minimum pour le mot de passe");
      return;
    }
    try {
      await register(email.trim().toLowerCase(), name.trim(), password);
      router.replace("/(tabs)/");
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Inscription échouée");
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🌍</Text>
            </View>
            <Text style={styles.logo}>Nomad</Text>
            <Text style={styles.subtitle}>
              Ton prochain voyage commence ici
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Crée ton compte</Text>

            <Input
              label="Prénom"
              placeholder="Hugo"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <Input
              label="Email"
              placeholder="ton@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="Mot de passe"
              placeholder="6 caractères minimum"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title="Commencer l'aventure"
              onPress={handleRegister}
              isLoading={isLoading}
              style={{ marginTop: spacing.sm }}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <Link href="/login" asChild>
              <Text style={styles.link}>Se connecter</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: radius.xxl,
    backgroundColor: colors.roseMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoEmoji: {
    fontSize: 32,
  },
  logo: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xxxl,
    color: colors.black,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.gray,
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  formTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xxl,
    color: colors.black,
    marginBottom: spacing.lg,
    letterSpacing: -0.5,
  },
  footer: {
    alignItems: "center",
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  link: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
    color: colors.rose,
  },
});
