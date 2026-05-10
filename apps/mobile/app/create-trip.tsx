import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import Animated, {
  SlideInRight,
  SlideInLeft,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import { useTripStore } from "../src/stores/tripStore";
import { DatePicker } from "../src/components/DatePicker";
import { PlacesAutocomplete } from "../src/components/PlacesAutocomplete";
import { LoadingOverlay } from "../src/components/LoadingOverlay";
import { fonts, fontSize, spacing, radius } from "../src/theme";
import { useTheme } from "../src/hooks/useTheme";
import type { ThemeColors } from "../src/theme";

const TOTAL_STEPS = 4;

const EMOJI_OPTIONS = [
  "✈️", "🌍", "🏖️", "🏔️", "🗼", "🏛️", "🌴", "🏝️", "🎒", "🚗",
  "🚂", "🛳️", "🏕️", "🌸", "🎿", "🏄", "🧳", "🗺️", "🌅", "🎭",
  "🇫🇷", "🇮🇹", "🇪🇸", "🇯🇵", "🇺🇸", "🇬🇧", "🇩🇪", "🇧🇷", "🇲🇽", "🇹🇭",
];

export default function CreateTripScreen() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [destination, setDestination] = useState("");
  const [emoji, setEmoji] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const createTrip = useTripStore((s) => s.createTrip);
  const hasNavigated = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Record<string, number>>({});
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const handleInputFocus = (y: number) => {
    setTimeout(() => scrollViewRef.current?.scrollTo({ y, animated: true }), 300);
  };
  const registerField = (name: string) => ({
    onLayout: (e: any) => { fieldOffsets.current[name] = e.nativeEvent.layout.y; },
    onFocus: () => handleInputFocus(fieldOffsets.current[name] ?? 0),
  });

  const next = () => {
    Keyboard.dismiss();
    hasNavigated.current = true;
    setDirection("forward");
    setStep((s) => s + 1);
  };

  const back = () => {
    hasNavigated.current = true;
    setDirection("back");
    setStep((s) => s - 1);
  };

  const handleCountryDetected = (flagEmoji: string) => {
    if (!emoji) {
      setEmoji(flagEmoji);
    }
  };

  const handleCreate = async () => {
    if (new Date(endDate) < new Date(startDate)) {
      Alert.alert("Erreur", "La date de fin doit être après le début");
      return;
    }

    setIsLoading(true);
    try {
      const trip = await createTrip({
        title: title.trim(),
        destination: destination.trim(),
        description: description.trim() || undefined,
        emoji: emoji || undefined,
        startDate,
        endDate,
      });
      router.replace(`/trip/${trip.id}`);
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible de créer le voyage");
    } finally {
      setIsLoading(false);
    }
  };

  const enterAnim = hasNavigated.current
    ? (direction === "forward" ? SlideInRight : SlideInLeft)
    : undefined;
  const exitAnim = direction === "forward" ? SlideOutLeft : SlideOutRight;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={step === 0 || step === 1}
    >
      <View style={styles.header}>
        <Pressable
          onPress={step === 0 ? () => router.back() : back}
          style={styles.headerBtn}
          hitSlop={12}
        >
          <Text style={styles.headerBtnText}>
            {step === 0 ? "✕" : "←"}
          </Text>
        </Pressable>

        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i <= step && styles.dotActive]}
            />
          ))}
        </View>

        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {step === 0 && (
          <Animated.View
            key="step-0"
            entering={enterAnim?.duration(300)}
            exiting={exitAnim.duration(200)}
            style={styles.step}
          >
            <Text style={styles.stepEmoji}>✈️</Text>
            <Text style={styles.question}>Où pars-tu ?</Text>
            <Text style={styles.hint}>
              Choisis ta destination pour commencer
            </Text>

            <ScrollView
              ref={scrollViewRef}
              style={styles.fieldContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 200 }}
            >
              <PlacesAutocomplete
                label=""
                value={destination}
                onSelect={setDestination}
                onCountryDetected={handleCountryDetected}
                onInputFocus={handleInputFocus}
                placeholder="Rechercher une ville ou un pays..."
              />
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={next}
                disabled={!destination.trim()}
                style={[
                  styles.nextBtn,
                  !destination.trim() && styles.nextBtnDisabled,
                ]}
              >
                <Text style={styles.nextBtnText}>Suivant</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View
            key="step-1"
            entering={enterAnim?.duration(300)}
            exiting={exitAnim.duration(200)}
            style={styles.step}
          >
            <Text style={styles.stepEmoji}>📝</Text>
            <Text style={styles.question}>
              Donne un nom à{"\n"}ton voyage
            </Text>
            <Text style={styles.hint}>
              Un petit nom pour t'y retrouver
            </Text>

            <ScrollView
              ref={scrollViewRef}
              style={styles.fieldContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 200 }}
            >
              <TextInput
                style={styles.input}
                placeholder="Ex: Road trip en Italie"
                placeholderTextColor={colors.grayMuted}
                value={title}
                onChangeText={setTitle}
                selectionColor={colors.rose}
                {...registerField("title")}
                autoFocus
              />
              <TextInput
                style={[styles.input, styles.inputSecondary]}
                placeholder="Description (optionnel)"
                placeholderTextColor={colors.grayMuted}
                value={description}
                onChangeText={setDescription}
                selectionColor={colors.rose}
                {...registerField("description")}
                multiline
                numberOfLines={2}
              />
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={next}
                disabled={!title.trim()}
                style={[
                  styles.nextBtn,
                  !title.trim() && styles.nextBtnDisabled,
                ]}
              >
                <Text style={styles.nextBtnText}>Suivant</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View
            key="step-2"
            entering={enterAnim?.duration(300)}
            exiting={exitAnim.duration(200)}
            style={styles.step}
          >
            <Text style={styles.stepEmoji}>{emoji || "🎨"}</Text>
            <Text style={styles.question}>Choisis un emoji</Text>
            <Text style={styles.hint}>
              {emoji
                ? "Tu peux en choisir un autre si tu veux"
                : "Il représentera ton voyage"}
            </Text>

            <View style={styles.fieldContainer}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.emojiScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.emojiGrid}>
                  {EMOJI_OPTIONS.map((e) => (
                    <Pressable
                      key={e}
                      onPress={() => setEmoji(e)}
                      style={[
                        styles.emojiCell,
                        emoji === e && styles.emojiCellActive,
                      ]}
                    >
                      <Text style={styles.emojiText}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.footer}>
              <Pressable
                onPress={next}
                disabled={!emoji}
                style={[
                  styles.nextBtn,
                  !emoji && styles.nextBtnDisabled,
                ]}
              >
                <Text style={styles.nextBtnText}>Suivant</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View
            key="step-3"
            entering={enterAnim?.duration(300)}
            exiting={exitAnim.duration(200)}
            style={styles.step}
          >
            <Text style={styles.stepEmoji}>📅</Text>
            <Text style={styles.question}>Quand pars-tu ?</Text>
            <Text style={styles.hint}>
              Sélectionne tes dates de voyage
            </Text>

            <View style={styles.fieldContainer}>
              <View style={styles.dateRow}>
                <View style={styles.dateHalf}>
                  <DatePicker
                    label="Départ"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Date"
                  />
                </View>
                <View style={styles.dateHalf}>
                  <DatePicker
                    label="Retour"
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Date"
                    minimumDate={startDate}
                  />
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable
                onPress={handleCreate}
                disabled={!startDate || !endDate || isLoading}
                style={[
                  styles.nextBtn,
                  (!startDate || !endDate || isLoading) && styles.nextBtnDisabled,
                ]}
              >
                <Text style={styles.nextBtnText}>
                  {isLoading ? "Création..." : "Créer le voyage"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
      <LoadingOverlay visible={isLoading} />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.grayLight,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 60,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.white,
      alignItems: "center",
      justifyContent: "center",
    },
    headerBtnText: {
      fontSize: 20,
      color: c.black,
    },
    dots: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radius.full,
      backgroundColor: c.grayBorder,
    },
    dotActive: {
      backgroundColor: c.rose,
      width: 24,
    },
    body: {
      flex: 1,
    },
    step: {
      ...StyleSheet.absoluteFillObject,
      paddingHorizontal: spacing.lg,
    },
    stepEmoji: {
      fontSize: 56,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    question: {
      fontFamily: fonts.bold,
      fontSize: fontSize.xxxl,
      color: c.black,
      letterSpacing: -1,
      lineHeight: 44,
      marginBottom: spacing.sm,
    },
    hint: {
      fontFamily: fonts.regular,
      fontSize: fontSize.md,
      color: c.gray,
      marginBottom: spacing.xl,
    },
    fieldContainer: {
      flex: 1,
    },
    input: {
      fontFamily: fonts.regular,
      fontSize: fontSize.lg,
      color: c.black,
      backgroundColor: c.white,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: c.grayBorder,
      marginBottom: spacing.md,
    },
    inputSecondary: {
      fontSize: fontSize.md,
      paddingVertical: 14,
      minHeight: 60,
      textAlignVertical: "top",
    },
    emojiScrollContent: {
      paddingBottom: spacing.sm,
    },
    emojiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    emojiCell: {
      width: 56,
      height: 56,
      borderRadius: radius.lg,
      backgroundColor: c.white,
      borderWidth: 2,
      borderColor: c.grayBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    emojiCellActive: {
      borderColor: c.rose,
      backgroundColor: c.roseLight,
    },
    emojiText: {
      fontSize: 28,
    },
    dateRow: {
      flexDirection: "row",
      gap: spacing.md,
    },
    dateHalf: {
      flex: 1,
    },
    footer: {
      paddingBottom: 40,
      paddingTop: spacing.md,
    },
    nextBtn: {
      backgroundColor: c.rose,
      borderRadius: radius.full,
      paddingVertical: 18,
      alignItems: "center",
    },
    nextBtnDisabled: {
      opacity: 0.3,
    },
    nextBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.md,
      color: "#FFFFFF",
    },
  });
