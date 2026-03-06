import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Link, router, Stack } from "expo-router";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { useAuthStore } from "../src/stores/authStore";
import { colors, fonts, fontSize, spacing, radius } from "../src/theme";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithGoogle, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Remplis tous les champs");
      return;
    }
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)/");
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Connexion échouée");
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      router.replace("/(tabs)/");
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Connexion Google échouée");
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.bg}>
        {/* Bottom wave gradient with SVG */}
        <View style={styles.waveContainer}>
          <Svg width={width} height={WAVE_H} viewBox={`0 0 ${width} ${WAVE_H}`}>
            <Defs>
              <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFD6CC" stopOpacity="0.4" />
                <Stop offset="0.35" stopColor="#FFAB91" stopOpacity="0.7" />
                <Stop offset="0.7" stopColor="#FF8A65" stopOpacity="0.85" />
                <Stop offset="1" stopColor="#FF7043" stopOpacity="1" />
              </SvgGradient>
            </Defs>
            <Path
              d={`M0,${WAVE_H * 0.35} Q${width * 0.25},${WAVE_H * 0.15} ${width * 0.5},${WAVE_H * 0.28} Q${width * 0.75},${WAVE_H * 0.42} ${width},${WAVE_H * 0.25} L${width},${WAVE_H} L0,${WAVE_H} Z`}
              fill="url(#grad)"
            />
          </Svg>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Spacer top */}
            <View style={styles.spacerTop} />

            {/* Icon */}
            <View style={styles.iconRow}>
              <Text style={styles.icon}>✈️</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              Ton prochain{"\n"}voyage commence{"\n"}ici.
            </Text>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              <Pressable style={styles.pillBtn} onPress={handleGoogle}>
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.pillBtnText}>Continuer avec Google</Text>
              </Pressable>

              {!showEmailForm ? (
                <Pressable
                  style={styles.pillBtn}
                  onPress={() => setShowEmailForm(true)}
                >
                  <Text style={styles.mailIcon}>✉️</Text>
                  <Text style={styles.pillBtnText}>
                    Se connecter par email
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.emailForm}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Adresse email"
                      placeholderTextColor={colors.grayMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      selectionColor={colors.rose}
                      autoFocus
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Mot de passe"
                      placeholderTextColor={colors.grayMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      selectionColor={colors.rose}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={8}
                    >
                      <Text style={styles.eyeText}>
                        {showPassword ? "Masquer" : "Afficher"}
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={[styles.submitBtn, isLoading && { opacity: 0.5 }]}
                    onPress={handleLogin}
                    disabled={isLoading}
                  >
                    <Text style={styles.submitBtnText}>
                      {isLoading ? "Connexion..." : "Se connecter"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Pas encore de compte ? </Text>
              <Link href="/register" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.footerLink}>S'inscrire ici</Text>
                </Pressable>
              </Link>
            </View>

            <View style={styles.spacerBottom} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const PILL_W = width * 0.72;
const WAVE_H = height * 0.38;

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  waveContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: WAVE_H,
  },
  // Content
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 30,
    zIndex: 3,
  },
  spacerTop: {
    flex: 1,
    minHeight: 80,
  },
  iconRow: {
    marginBottom: 28,
  },
  icon: {
    fontSize: 44,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 36,
    color: colors.black,
    textAlign: "center",
    lineHeight: 46,
    letterSpacing: -1,
    marginBottom: 48,
  },
  // Buttons
  buttonsContainer: {
    alignItems: "center",
    gap: 14,
    marginBottom: 36,
  },
  pillBtn: {
    width: PILL_W,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  googleG: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: "#4285F4",
  },
  mailIcon: {
    fontSize: 16,
  },
  pillBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.black,
  },
  // Email form
  emailForm: {
    width: PILL_W,
    gap: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.grayLight,
    borderRadius: radius.full,
    height: 54,
    paddingHorizontal: 20,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.black,
    paddingVertical: 0,
  },
  eyeText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.rose,
    paddingLeft: 8,
  },
  submitBtn: {
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.rose,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.white,
  },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.black,
  },
  footerLink: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.rose,
  },
  spacerBottom: {
    flex: 1,
    minHeight: 120,
  },
});
