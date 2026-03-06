import { useState, useEffect, useRef } from "react";
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
  TouchableWithoutFeedback,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import Animated, {
  SlideInRight,
  SlideInLeft,
  SlideOutLeft,
  SlideOutRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTripStore } from "../../src/stores/tripStore";
import { TimePicker } from "../../src/components/TimePicker";
import { PlacesAutocomplete } from "../../src/components/PlacesAutocomplete";
import { colors, fonts, fontSize, spacing, radius } from "../../src/theme";
import { getTransitDuration } from "../../src/utils/directions";
import { transportModes, shouldCalculateDuration } from "../../src/utils/transportModes";

const TOTAL_STEPS = 3;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TypeButton({
  item,
  isActive,
  onPress,
}: {
  item: { key: string; emoji: string; label: string; bg: string; accent: string };
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[
        styles.typeBtn,
        { backgroundColor: isActive ? item.bg : colors.white },
        isActive && { borderColor: item.accent },
        animStyle,
      ]}
    >
      <Text style={styles.typeEmoji}>{item.emoji}</Text>
      <Text
        style={[
          styles.typeLabel,
          { color: isActive ? item.accent : colors.grayMuted },
        ]}
      >
        {item.label}
      </Text>
    </AnimatedPressable>
  );
}

const itemTypes = [
  { key: "activity" as const, emoji: "📍", label: "Activité", bg: colors.roseLight, accent: colors.rose },
  { key: "accommodation" as const, emoji: "🏨", label: "Hébergement", bg: "rgba(66, 139, 255, 0.08)", accent: colors.blue },
  { key: "transport" as const, emoji: "✈️", label: "Transport", bg: "rgba(224, 121, 18, 0.08)", accent: colors.orange },
  { key: "note" as const, emoji: "📝", label: "Note", bg: colors.grayLight, accent: colors.gray },
];

function getTypeConfig(type: string) {
  return itemTypes.find((t) => t.key === type) || itemTypes[0];
}

export default function AddItemScreen() {
  const params = useLocalSearchParams<{
    dayId: string;
    startTime?: string;
    endTime?: string;
  }>();
  const { dayId } = params;
  const addItem = useTripStore((s) => s.addItem);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [type, setType] = useState<"activity" | "accommodation" | "transport" | "note">("activity");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [arrivalLocation, setArrivalLocation] = useState("");
  const [startTime, setStartTime] = useState(params.startTime ?? "");
  const [endTime, setEndTime] = useState(params.endTime ?? "");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [transportMode, setTransportMode] = useState("avion");
  const [isLoading, setIsLoading] = useState(false);
  const [durationSuggestion, setDurationSuggestion] = useState<{ duration: string; durationMinutes: number; mode: "driving" | "walking" } | null>(null);
  const [durationLoading, setDurationLoading] = useState(false);

  useEffect(() => {
    if (!isTransport || !shouldCalculateDuration(transportMode) || !location.trim() || !arrivalLocation.trim()) {
      setDurationSuggestion(null);
      return;
    }
    let cancelled = false;
    setDurationLoading(true);
    getTransitDuration(location.trim(), arrivalLocation.trim()).then((result) => {
      if (cancelled) return;
      setDurationSuggestion(result);
      setDurationLoading(false);
    });
    return () => { cancelled = true; };
  }, [isTransport, transportMode, location, arrivalLocation]);

  const isTransport = type === "transport";

  const next = () => {
    hasNavigated.current = true;
    setDirection("forward");
    setStep((s) => s + 1);
  };

  const back = () => {
    hasNavigated.current = true;
    setDirection("back");
    setStep((s) => s - 1);
  };

  const handleAdd = async () => {
    const finalTitle = isTransport
      ? `${location.trim() || "?"} → ${arrivalLocation.trim() || "?"}`
      : title.trim();

    if (!isTransport && !title.trim()) {
      Alert.alert("Erreur", "Ajoute un titre");
      return;
    }
    if (isTransport && !location.trim() && !arrivalLocation.trim()) {
      Alert.alert("Erreur", "Ajoute au moins un lieu");
      return;
    }
    if (!dayId) return;

    setIsLoading(true);
    try {
      await addItem(dayId, {
        type,
        title: finalTitle,
        description: description.trim() || undefined,
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        location: location.trim() || undefined,
        arrivalLocation: arrivalLocation.trim() || undefined,
        transportMode: isTransport ? transportMode : undefined,
        price: price ? parseFloat(price) : undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible d'ajouter");
    } finally {
      setIsLoading(false);
    }
  };

  const hasNavigated = useRef(false);
  const enterAnim = hasNavigated.current
    ? (direction === "forward" ? SlideInRight : SlideInLeft)
    : undefined;
  const exitAnim = direction === "forward" ? SlideOutLeft : SlideOutRight;
  const typeConfig = getTypeConfig(type);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
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

        {/* Steps */}
        <View style={styles.body}>
          {/* Step 0: Type */}
          {step === 0 && (
            <Animated.View
              key="step-0"
              entering={enterAnim?.duration(300)}
              exiting={exitAnim.duration(200)}
              style={styles.step}
            >
              <Text style={styles.stepEmoji}>{typeConfig.emoji}</Text>
              <Text style={styles.question}>Quel type ?</Text>
              <Text style={styles.hint}>
                Choisis le type d'élément à ajouter
              </Text>

              <View style={styles.fieldContainer}>
                <View style={styles.typeGrid}>
                  {itemTypes.map((item) => (
                    <TypeButton
                      key={item.key}
                      item={item}
                      isActive={type === item.key}
                      onPress={() => setType(item.key)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.footer}>
                <Pressable onPress={next} style={styles.nextBtn}>
                  <Text style={styles.nextBtnText}>Suivant</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Step 1: Title + Description + Location */}
          {step === 1 && (
            <Animated.View
              key="step-1"
              entering={enterAnim?.duration(300)}
              exiting={exitAnim.duration(200)}
              style={styles.step}
            >
              <ScrollView
                style={styles.fieldContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.stepEmoji}>{typeConfig.emoji}</Text>
                <Text style={styles.question}>
                  {isTransport ? "Ton trajet" : `Décris ton\n${typeConfig.label.toLowerCase()}`}
                </Text>
                <Text style={styles.hint}>
                  {isTransport
                    ? "D'où pars-tu et où vas-tu ?"
                    : "Un titre est requis, le reste est optionnel"}
                </Text>
                {isTransport && (
                  <>
                    <Text style={styles.sectionLabel}>Mode de transport</Text>
                    <View style={styles.transportModeGrid}>
                      {transportModes.map((mode) => (
                        <Pressable
                          key={mode.key}
                          onPress={() => setTransportMode(mode.key)}
                          style={[
                            styles.transportModeBtn,
                            transportMode === mode.key && styles.transportModeBtnActive,
                          ]}
                        >
                          <Text style={styles.transportModeEmoji}>{mode.emoji}</Text>
                          <Text
                            style={[
                              styles.transportModeLabel,
                              transportMode === mode.key && styles.transportModeLabelActive,
                            ]}
                          >
                            {mode.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
                {!isTransport && (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Titre"
                      placeholderTextColor={colors.grayMuted}
                      value={title}
                      onChangeText={setTitle}
                      selectionColor={colors.rose}
                      autoFocus
                    />
                    <TextInput
                      style={[styles.input, styles.inputSecondary]}
                      placeholder="Description (optionnel)"
                      placeholderTextColor={colors.grayMuted}
                      value={description}
                      onChangeText={setDescription}
                      selectionColor={colors.rose}
                      multiline
                      numberOfLines={2}
                    />
                  </>
                )}
                <PlacesAutocomplete
                  label={isTransport ? "Départ" : "Lieu"}
                  value={location}
                  onSelect={setLocation}
                  placeholder={
                    isTransport
                      ? "Gare, aéroport, ville..."
                      : type === "accommodation"
                        ? "Nom de l'hôtel, adresse..."
                        : "Adresse, lieu..."
                  }
                  types="establishment"
                />
                {isTransport && (
                  <PlacesAutocomplete
                    label="Arrivée"
                    value={arrivalLocation}
                    onSelect={setArrivalLocation}
                    placeholder="Gare, aéroport, ville..."
                    types="establishment"
                  />
                )}
              </ScrollView>

              <View style={styles.footer}>
                <Pressable
                  onPress={next}
                  disabled={isTransport ? (!location.trim() && !arrivalLocation.trim()) : !title.trim()}
                  style={[
                    styles.nextBtn,
                    (isTransport ? (!location.trim() && !arrivalLocation.trim()) : !title.trim()) && styles.nextBtnDisabled,
                  ]}
                >
                  <Text style={styles.nextBtnText}>Suivant</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Step 2: Time + Price + Notes */}
          {step === 2 && (
            <Animated.View
              key="step-2"
              entering={enterAnim?.duration(300)}
              exiting={exitAnim.duration(200)}
              style={styles.step}
            >
              <ScrollView
                style={styles.fieldContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.stepEmoji}>⏰</Text>
                <Text style={styles.question}>
                  {isTransport ? "Horaires du trajet" : "Quand et combien ?"}
                </Text>
                <Text style={styles.hint}>
                  {isTransport
                    ? "Heure de départ et d'arrivée"
                    : "Tout est optionnel, tu pourras compléter plus tard"}
                </Text>
                {isTransport && durationLoading && (
                  <View style={styles.durationBanner}>
                    <Text style={styles.durationText}>Calcul du trajet...</Text>
                  </View>
                )}
                {isTransport && durationSuggestion && !durationLoading && (
                  <View style={styles.durationBanner}>
                    <Text style={styles.durationText}>
                      {durationSuggestion.mode === "walking" ? "🚶" : "🚗"}{" "}
                      Durée estimée : {durationSuggestion.duration}
                    </Text>
                    {startTime.trim() && !endTime.trim() && (
                      <Pressable
                        onPress={() => {
                          const [h, m] = startTime.split(":").map(Number);
                          const totalMin = h * 60 + m + durationSuggestion.durationMinutes;
                          const endH = Math.floor(totalMin / 60) % 24;
                          const endM = totalMin % 60;
                          setEndTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
                        }}
                        style={styles.durationApplyBtn}
                      >
                        <Text style={styles.durationApplyText}>Appliquer</Text>
                      </Pressable>
                    )}
                  </View>
                )}
                <View style={styles.timeRow}>
                  <View style={styles.timeHalf}>
                    <TimePicker
                      label={isTransport ? "Départ" : "Début"}
                      value={startTime}
                      onChange={setStartTime}
                      placeholder={isTransport ? "14:30" : "09:00"}
                    />
                  </View>
                  <View style={styles.timeHalf}>
                    <TimePicker
                      label={isTransport ? "Arrivée" : "Fin"}
                      value={endTime}
                      onChange={setEndTime}
                      placeholder={isTransport ? "16:45" : "12:00"}
                    />
                  </View>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Prix (optionnel)"
                  placeholderTextColor={colors.grayMuted}
                  value={price}
                  onChangeText={setPrice}
                  selectionColor={colors.rose}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, styles.inputSecondary]}
                  placeholder={
                    isTransport
                      ? "N° de vol, réservation... (optionnel)"
                      : "Notes (optionnel)"
                  }
                  placeholderTextColor={colors.grayMuted}
                  value={notes}
                  onChangeText={setNotes}
                  selectionColor={colors.rose}
                  multiline
                  numberOfLines={2}
                />
                <Text style={styles.docsHint}>
                  Tu pourras ajouter des documents après création
                </Text>
              </ScrollView>

              <View style={styles.footer}>
                <Pressable
                  onPress={handleAdd}
                  disabled={isLoading}
                  style={[
                    styles.nextBtn,
                    isLoading && styles.nextBtnDisabled,
                  ]}
                >
                  <Text style={styles.nextBtnText}>
                    {isLoading ? "Ajout..." : "Ajouter"}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  // Header
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
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnText: {
    fontSize: 20,
    color: colors.black,
  },
  // Dots
  dots: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.grayBorder,
  },
  dotActive: {
    backgroundColor: colors.rose,
    width: 24,
  },
  // Body
  body: {
    flex: 1,
  },
  step: {
    flex: 1,
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
    color: colors.black,
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: spacing.sm,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.gray,
    marginBottom: spacing.xl,
  },
  fieldContainer: {
    flex: 1,
  },
  // Type grid
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  typeBtn: {
    width: "47%",
    alignItems: "center",
    paddingVertical: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.grayBorder,
  },
  typeEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  typeLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
    letterSpacing: 0.3,
  },
  // Transport mode
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  transportModeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  transportModeBtn: {
    width: "22%",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.grayBorder,
    backgroundColor: colors.white,
  },
  transportModeBtnActive: {
    borderColor: colors.orange,
    backgroundColor: "rgba(224, 121, 18, 0.08)",
  },
  transportModeEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  transportModeLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xxs,
    color: colors.grayMuted,
  },
  transportModeLabelActive: {
    color: colors.orange,
  },
  // Inputs
  input: {
    fontFamily: fonts.regular,
    fontSize: fontSize.lg,
    color: colors.black,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: colors.grayBorder,
    marginBottom: spacing.md,
  },
  inputSecondary: {
    fontSize: fontSize.md,
    paddingVertical: 14,
    minHeight: 60,
    textAlignVertical: "top",
  },
  docsHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.grayMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  // Duration suggestion
  durationBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(224, 121, 18, 0.08)",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  durationText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.orange,
    flex: 1,
  },
  durationApplyBtn: {
    backgroundColor: colors.orange,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
  },
  durationApplyText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xs,
    color: colors.white,
  },
  // Time
  timeRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  timeHalf: {
    flex: 1,
  },
  // Footer
  footer: {
    paddingBottom: 40,
    paddingTop: spacing.md,
  },
  nextBtn: {
    backgroundColor: colors.rose,
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
    color: colors.white,
  },
});
