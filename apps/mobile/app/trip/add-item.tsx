import { router, useLocalSearchParams } from "expo-router";
import {
  Calendar,
  Car,
  Clock,
  FileText,
  Footprints,
  Hotel,
  MapPin,
  Plane,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  SlideInRight,
  SlideInLeft,
  SlideOutLeft,
  SlideOutRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { DatePicker } from "../../src/components/DatePicker";
import { DocumentPicker } from "../../src/components/DocumentPicker";
import { LoadingOverlay } from "../../src/components/LoadingOverlay";
import { PlacesAutocomplete } from "../../src/components/PlacesAutocomplete";
import { TimePicker } from "../../src/components/TimePicker";
import { useTheme } from "../../src/hooks/useTheme";
import { useTripStore } from "../../src/stores/tripStore";
import { fontSize, fonts, radius, spacing } from "../../src/theme";
import type { ThemeColors } from "../../src/theme";
import { getTransitDuration } from "../../src/utils/directions";
import {
  getPlacesPlaceholderForMode,
  getPlacesTypesForMode,
  shouldCalculateDuration,
  transportModes,
} from "../../src/utils/transportModes";

const TOTAL_STEPS = 3;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getItemTypes = (c: ThemeColors) => [
  { key: "activity" as const, icon: MapPin, label: "Activité", bg: c.roseLight, accent: c.rose },
  {
    key: "accommodation" as const,
    icon: Hotel,
    label: "Hébergement",
    bg: "rgba(66, 139, 255, 0.08)",
    accent: c.blue,
  },
  {
    key: "transport" as const,
    icon: Plane,
    label: "Transport",
    bg: "rgba(224, 121, 18, 0.08)",
    accent: c.orange,
  },
  { key: "note" as const, icon: FileText, label: "Note", bg: c.grayLight, accent: c.gray },
];

function TypeButton({
  item,
  isActive,
  onPress,
  colors,
}: {
  item: ReturnType<typeof getItemTypes>[number];
  isActive: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const IconComponent = item.icon;

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
        {
          width: "47%",
          alignItems: "center" as const,
          paddingVertical: spacing.xl,
          borderRadius: radius.xl,
          borderWidth: 2,
          borderColor: isActive ? item.accent : colors.grayBorder,
          backgroundColor: isActive ? item.bg : colors.white,
        },
        animStyle,
      ]}
    >
      <IconComponent size={32} color={isActive ? item.accent : colors.grayMuted} />
      <Text
        style={{
          fontFamily: fonts.semiBold,
          fontSize: fontSize.sm,
          letterSpacing: 0.3,
          color: isActive ? item.accent : colors.grayMuted,
          marginTop: spacing.sm,
        }}
      >
        {item.label}
      </Text>
    </AnimatedPressable>
  );
}

export default function AddItemScreen() {
  const params = useLocalSearchParams<{
    dayId?: string;
    tripId?: string;
    startTime?: string;
    endTime?: string;
  }>();
  const { dayId, tripId } = params;
  const addItem = useTripStore((s) => s.addItem);
  const addTripIdea = useTripStore((s) => s.addTripIdea);
  const uploadDocument = useTripStore((s) => s.uploadDocument);
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const itemTypes = getItemTypes(colors);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [type, setType] = useState<"activity" | "accommodation" | "transport" | "note">("activity");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [arrivalLocation, setArrivalLocation] = useState("");
  const [startTime, setStartTime] = useState(params.startTime ?? "");
  const [endTime, setEndTime] = useState(params.endTime ?? "");
  const [showTime, setShowTime] = useState(!!(params.startTime || params.endTime));
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [transportMode, setTransportMode] = useState("avion");
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationSuggestion, setDurationSuggestion] = useState<{
    duration: string;
    durationMinutes: number;
    mode: "driving" | "walking";
  } | null>(null);
  const [durationLoading, setDurationLoading] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<
    Array<{ uri: string; name: string; type: string; size: number }>
  >([]);

  const isAccommodation = type === "accommodation";
  const isTransport = type === "transport";

  useEffect(() => {
    if (
      !isTransport ||
      !shouldCalculateDuration(transportMode) ||
      !location.trim() ||
      !arrivalLocation.trim()
    ) {
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
    return () => {
      cancelled = true;
    };
  }, [isTransport, transportMode, location, arrivalLocation]);

  const hasNavigated = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Record<string, number>>({});
  const handleInputFocus = (y: number) => {
    setTimeout(() => scrollViewRef.current?.scrollTo({ y, animated: true }), 300);
  };
  const registerField = (name: string) => ({
    onLayout: (e: any) => {
      fieldOffsets.current[name] = e.nativeEvent.layout.y;
    },
    onFocus: () => handleInputFocus(fieldOffsets.current[name] ?? 0),
  });

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
    if (!dayId && !tripId) return;

    const itemData = {
      type,
      title: finalTitle,
      description: description.trim() || undefined,
      startTime: isAccommodation ? undefined : startTime.trim() || undefined,
      endTime: isAccommodation ? undefined : endTime.trim() || undefined,
      startDate: isAccommodation ? startDate || undefined : undefined,
      endDate: isAccommodation ? endDate || undefined : undefined,
      location: location.trim() || undefined,
      arrivalLocation: arrivalLocation.trim() || undefined,
      transportMode: isTransport ? transportMode : undefined,
      price: price ? Number.parseFloat(price) : undefined,
      notes: notes.trim() || undefined,
    };

    setIsLoading(true);
    try {
      const item = tripId ? await addTripIdea(tripId, itemData) : await addItem(dayId!, itemData);
      for (const file of pendingDocuments) {
        await uploadDocument(item.id, file);
      }
      router.back();
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible d'ajouter");
    } finally {
      setIsLoading(false);
    }
  };

  const timeError = isAccommodation
    ? startDate && endDate && startDate >= endDate
      ? "La date de check-out doit être après le check-in"
      : null
    : startTime.trim() && endTime.trim() && startTime.trim() >= endTime.trim()
      ? "L'heure de fin doit être après l'heure de début"
      : null;

  const enterAnim = hasNavigated.current
    ? direction === "forward"
      ? SlideInRight
      : SlideInLeft
    : undefined;
  const exitAnim = direction === "forward" ? SlideOutLeft : SlideOutRight;
  const typeConfig = itemTypes.find((t) => t.key === type) || itemTypes[0];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={step === 1}
    >
      <View style={styles.header}>
        <Pressable
          onPress={step === 0 ? () => router.back() : back}
          style={styles.headerBtn}
          hitSlop={12}
        >
          <Text style={styles.headerBtnText}>{step === 0 ? "✕" : "←"}</Text>
        </Pressable>

        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
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
            <View style={styles.stepIconContainer}>
              <typeConfig.icon size={48} color={typeConfig.accent} />
            </View>
            <Text style={styles.question}>Quel type ?</Text>
            <Text style={styles.hint}>Choisis le type d'élément à ajouter</Text>

            <View style={styles.fieldContainer}>
              <View style={styles.typeGrid}>
                {itemTypes.map((item) => (
                  <TypeButton
                    key={item.key}
                    item={item}
                    isActive={type === item.key}
                    onPress={() => setType(item.key)}
                    colors={colors}
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

        {step === 1 && (
          <Animated.View
            key="step-1"
            entering={enterAnim?.duration(300)}
            exiting={exitAnim.duration(200)}
            style={styles.step}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.fieldContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
              contentContainerStyle={{ paddingBottom: 200 }}
            >
              <View style={styles.stepIconContainer}>
                <typeConfig.icon size={48} color={typeConfig.accent} />
              </View>
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
                    {transportModes.map((mode) => {
                      const ModeIcon = mode.icon;
                      const isActive = transportMode === mode.key;
                      return (
                        <Pressable
                          key={mode.key}
                          onPress={() => setTransportMode(mode.key)}
                          style={[
                            styles.transportModeBtn,
                            isActive && styles.transportModeBtnActive,
                          ]}
                        >
                          <ModeIcon size={22} color={isActive ? colors.orange : colors.grayMuted} />
                          <Text
                            style={[
                              styles.transportModeLabel,
                              isActive && styles.transportModeLabelActive,
                            ]}
                          >
                            {mode.label}
                          </Text>
                        </Pressable>
                      );
                    })}
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
                </>
              )}
              <PlacesAutocomplete
                label={isTransport ? "Départ" : undefined}
                value={location}
                onSelect={setLocation}
                onInputFocus={handleInputFocus}
                placeholder={
                  isTransport
                    ? getPlacesPlaceholderForMode(transportMode)
                    : type === "accommodation"
                      ? "Nom de l'hôtel, adresse... (optionnel)"
                      : "Adresse, lieu... (optionnel)"
                }
                types={isTransport ? getPlacesTypesForMode(transportMode) : "establishment"}
              />
              {isTransport && (
                <PlacesAutocomplete
                  label="Arrivée"
                  value={arrivalLocation}
                  onSelect={setArrivalLocation}
                  onInputFocus={handleInputFocus}
                  placeholder={getPlacesPlaceholderForMode(transportMode)}
                  types={getPlacesTypesForMode(transportMode)}
                />
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={next}
                disabled={isTransport ? !location.trim() && !arrivalLocation.trim() : !title.trim()}
                style={[
                  styles.nextBtn,
                  (isTransport ? !location.trim() && !arrivalLocation.trim() : !title.trim()) &&
                    styles.nextBtnDisabled,
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
            <ScrollView
              ref={scrollViewRef}
              style={styles.fieldContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
              contentContainerStyle={{ paddingBottom: 200 }}
            >
              <View style={styles.stepIconContainer}>
                {isAccommodation ? (
                  <Calendar size={48} color={colors.blue} />
                ) : (
                  <Clock size={48} color={colors.rose} />
                )}
              </View>
              <Text style={styles.question}>
                {isAccommodation
                  ? "Dates du séjour"
                  : isTransport
                    ? "Horaires du trajet"
                    : "Quand et combien ?"}
              </Text>
              <Text style={styles.hint}>
                {isAccommodation
                  ? "Dates de check-in et check-out"
                  : isTransport
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
                  <View style={styles.durationLeft}>
                    {durationSuggestion.mode === "walking" ? (
                      <Footprints size={14} color={colors.orange} />
                    ) : (
                      <Car size={14} color={colors.orange} />
                    )}
                    <Text style={styles.durationText}>
                      Durée estimée : {durationSuggestion.duration}
                    </Text>
                  </View>
                  {startTime.trim() && !endTime.trim() && (
                    <Pressable
                      onPress={() => {
                        const [h, m] = startTime.split(":").map(Number);
                        const totalMin = h * 60 + m + durationSuggestion.durationMinutes;
                        const endH = Math.floor(totalMin / 60) % 24;
                        const endM = totalMin % 60;
                        setEndTime(
                          `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
                        );
                      }}
                      style={styles.durationApplyBtn}
                    >
                      <Text style={styles.durationApplyText}>Appliquer</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {isAccommodation ? (
                <View style={styles.timeRow}>
                  <View style={styles.timeHalf}>
                    <DatePicker
                      label="Check-in"
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Arrivée"
                    />
                  </View>
                  <View style={styles.timeHalf}>
                    <DatePicker
                      label="Check-out"
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="Départ"
                      minimumDate={startDate || undefined}
                    />
                  </View>
                </View>
              ) : isTransport ? (
                <View style={styles.timeRow}>
                  <View style={styles.timeHalf}>
                    <TimePicker
                      label="Départ"
                      value={startTime}
                      onChange={setStartTime}
                      placeholder="14:30"
                    />
                  </View>
                  <View style={styles.timeHalf}>
                    <TimePicker
                      label="Arrivée"
                      value={endTime}
                      onChange={setEndTime}
                      placeholder="16:45"
                    />
                  </View>
                </View>
              ) : showTime ? (
                <>
                  <View style={styles.timeRow}>
                    <View style={styles.timeHalf}>
                      <TimePicker
                        label="Début"
                        value={startTime}
                        onChange={setStartTime}
                        placeholder="09:00"
                      />
                    </View>
                    <View style={styles.timeHalf}>
                      <TimePicker
                        label="Fin"
                        value={endTime}
                        onChange={setEndTime}
                        placeholder="12:00"
                      />
                    </View>
                  </View>
                  <Pressable
                    onPress={() => {
                      setShowTime(false);
                      setStartTime("");
                      setEndTime("");
                    }}
                    style={styles.removeTimeBtn}
                  >
                    <Text style={styles.removeTimeBtnText}>Supprimer l'horaire</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => {
                    // Sync state with what the picker will display (current time
                    // rounded to 15 min) so that saving without touching the
                    // picker still produces a valid startTime.
                    if (!startTime) {
                      const now = new Date();
                      const totalMin = now.getHours() * 60 + now.getMinutes();
                      const snapped = Math.round(totalMin / 15) * 15;
                      const h = Math.floor(snapped / 60) % 24;
                      const m = snapped % 60;
                      setStartTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                    }
                    setShowTime(true);
                  }}
                  style={styles.addTimeBtn}
                >
                  <Text style={styles.addTimeBtnText}>+ Ajouter un horaire</Text>
                </Pressable>
              )}
              {timeError && <Text style={styles.timeError}>{timeError}</Text>}
              <TextInput
                style={styles.input}
                placeholder="Prix (optionnel)"
                placeholderTextColor={colors.grayMuted}
                value={price}
                onChangeText={setPrice}
                selectionColor={colors.rose}
                {...registerField("price")}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, styles.inputSecondary]}
                placeholder={
                  isTransport ? "N° de vol, réservation... (optionnel)" : "Notes (optionnel)"
                }
                placeholderTextColor={colors.grayMuted}
                value={notes}
                onChangeText={setNotes}
                selectionColor={colors.rose}
                {...registerField("notes")}
                multiline
                numberOfLines={2}
              />
              <Text style={styles.sectionLabel}>Documents</Text>
              <DocumentPicker onPick={(file) => setPendingDocuments((prev) => [...prev, file])} />
              {pendingDocuments.map((doc, i) => (
                <View key={i} style={styles.pendingDocItem}>
                  <Text style={styles.pendingDocName} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Pressable
                    onPress={() => setPendingDocuments((prev) => prev.filter((_, j) => j !== i))}
                    hitSlop={8}
                  >
                    <Text style={styles.pendingDocRemove}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={handleAdd}
                disabled={isLoading || !!timeError}
                style={[styles.nextBtn, (isLoading || !!timeError) && styles.nextBtnDisabled]}
              >
                <Text style={styles.nextBtnText}>{isLoading ? "Ajout..." : "Ajouter"}</Text>
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
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    stepIconContainer: {
      marginTop: spacing.lg,
      marginBottom: spacing.md,
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
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
    typeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
    },
    sectionLabel: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.sm,
      color: c.black,
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
      borderColor: c.grayBorder,
      backgroundColor: c.white,
    },
    transportModeBtnActive: {
      borderColor: c.orange,
      backgroundColor: "rgba(224, 121, 18, 0.08)",
    },
    transportModeLabel: {
      fontFamily: fonts.medium,
      fontSize: fontSize.xxs,
      color: c.grayMuted,
    },
    transportModeLabelActive: {
      color: c.orange,
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
    pendingDocItem: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: c.white,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.grayBorder,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    pendingDocName: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: fontSize.sm,
      color: c.black,
    },
    pendingDocRemove: {
      fontFamily: fonts.medium,
      fontSize: fontSize.sm,
      color: c.grayMuted,
    },
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
    durationLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    durationText: {
      fontFamily: fonts.medium,
      fontSize: fontSize.sm,
      color: c.orange,
    },
    durationApplyBtn: {
      backgroundColor: c.orange,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginLeft: spacing.sm,
    },
    durationApplyText: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.xs,
      color: "#FFFFFF",
    },
    addTimeBtn: {
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: c.grayBorder,
      borderStyle: "dashed",
      paddingVertical: 18,
      alignItems: "center",
      marginBottom: spacing.md,
    },
    addTimeBtnText: {
      fontFamily: fonts.medium,
      fontSize: fontSize.md,
      color: c.gray,
    },
    removeTimeBtn: {
      alignItems: "center",
      marginBottom: spacing.md,
      paddingVertical: spacing.sm,
    },
    removeTimeBtnText: {
      fontFamily: fonts.medium,
      fontSize: fontSize.sm,
      color: c.red,
    },
    timeRow: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    timeError: {
      fontFamily: fonts.medium,
      fontSize: fontSize.xs,
      color: c.red,
      marginBottom: spacing.md,
    },
    timeHalf: {
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
