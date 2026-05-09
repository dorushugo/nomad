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
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTripStore } from "../../src/stores/tripStore";
import { TimePicker } from "../../src/components/TimePicker";
import { DatePicker } from "../../src/components/DatePicker";
import { PlacesAutocomplete } from "../../src/components/PlacesAutocomplete";
import { LoadingOverlay } from "../../src/components/LoadingOverlay";
import { colors, fonts, fontSize, spacing, radius, shadow } from "../../src/theme";
import { getTransitDuration } from "../../src/utils/directions";
import {
  transportModes,
  shouldCalculateDuration,
  getPlacesTypesForMode,
  getPlacesPlaceholderForMode,
} from "../../src/utils/transportModes";
import { DocumentPicker } from "../../src/components/DocumentPicker";
import { DocumentList } from "../../src/components/DocumentList";

const itemTypes = [
  { key: "activity" as const, emoji: "📍", label: "Activité", bg: colors.roseLight, accent: colors.rose },
  { key: "accommodation" as const, emoji: "🏨", label: "Hébergement", bg: "rgba(66, 139, 255, 0.08)", accent: colors.blue },
  { key: "transport" as const, emoji: "✈️", label: "Transport", bg: "rgba(224, 121, 18, 0.08)", accent: colors.orange },
  { key: "note" as const, emoji: "📝", label: "Note", bg: colors.grayLight, accent: colors.gray },
];

function getTypeConfig(type: string) {
  return itemTypes.find((t) => t.key === type) || itemTypes[0];
}

export default function EditItemScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { trips, updateItem, deleteItem, uploadDocument, deleteDocument } = useTripStore();

  let foundItem = null;
  for (const trip of trips) {
    for (const day of trip.days ?? []) {
      const match = (day.items ?? []).find((i) => i.id === itemId);
      if (match) {
        foundItem = match;
        break;
      }
    }
    if (foundItem) break;
  }

  const [type, setType] = useState<"activity" | "accommodation" | "transport" | "note">(foundItem?.type ?? "activity");
  const [title, setTitle] = useState(foundItem?.title ?? "");
  const [description, setDescription] = useState(foundItem?.description ?? "");
  const [location, setLocation] = useState(foundItem?.location ?? "");
  const [arrivalLocation, setArrivalLocation] = useState(foundItem?.arrivalLocation ?? "");
  const [startTime, setStartTime] = useState(foundItem?.startTime ?? "");
  const [endTime, setEndTime] = useState(foundItem?.endTime ?? "");
  const [price, setPrice] = useState(foundItem?.price != null ? String(foundItem.price) : "");
  const [notes, setNotes] = useState(foundItem?.notes ?? "");
  const [transportMode, setTransportMode] = useState(foundItem?.transportMode ?? "avion");
  const [startDate, setStartDate] = useState(foundItem?.startDate ?? "");
  const [endDate, setEndDate] = useState(foundItem?.endDate ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [durationSuggestion, setDurationSuggestion] = useState<{
    duration: string;
    durationMinutes: number;
    mode: "driving" | "walking";
  } | null>(null);
  const [durationLoading, setDurationLoading] = useState(false);

  const isTransport = type === "transport";
  const isAccommodation = type === "accommodation";

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
    return () => {
      cancelled = true;
    };
  }, [isTransport, transportMode, location, arrivalLocation]);

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

  const handleSave = async () => {
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
    if (timeError) return;
    if (!itemId) return;

    setIsLoading(true);
    try {
      await updateItem(itemId, {
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
        price: price ? parseFloat(price) : undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible de modifier");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Supprimer cet élément ?", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          if (!itemId) return;
          try {
            await deleteItem(itemId);
            router.back();
          } catch (error: any) {
            Alert.alert("Erreur", error.message || "Impossible de supprimer");
          }
        },
      },
    ]);
  };

  if (!foundItem) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Élément introuvable</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
          <Text style={[styles.centerText, { color: colors.rose }]}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const typeConfig = getTypeConfig(type);

  const timeError = isAccommodation
    ? startDate && endDate && startDate >= endDate
      ? "La date de check-out doit être après le check-in"
      : null
    : startTime.trim() && endTime.trim() && startTime.trim() >= endTime.trim()
    ? "L'heure de fin doit être après l'heure de début"
    : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
          <View style={styles.headerTitle}>
            <Text style={styles.headerEmoji}>{typeConfig.emoji}</Text>
            <Text style={styles.headerText}>Modifier</Text>
          </View>
          <Pressable onPress={handleDelete} hitSlop={12}>
            <Text style={styles.deleteText}>Supprimer</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Type */}
          <Section label="Type">
            <View style={styles.typeRow}>
              {itemTypes.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setType(item.key)}
                  style={[
                    styles.typeChip,
                    type === item.key && { backgroundColor: item.bg, borderColor: item.accent },
                  ]}
                >
                  <Text style={styles.typeChipEmoji}>{item.emoji}</Text>
                  <Text
                    style={[
                      styles.typeChipLabel,
                      { color: type === item.key ? item.accent : colors.grayMuted },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>

          {/* Transport mode */}
          {isTransport && (
            <Section label="Mode de transport">
              <View style={styles.transportGrid}>
                {transportModes.map((mode) => (
                  <Pressable
                    key={mode.key}
                    onPress={() => setTransportMode(mode.key)}
                    style={[
                      styles.transportChip,
                      transportMode === mode.key && styles.transportChipActive,
                    ]}
                  >
                    <Text style={styles.transportChipEmoji}>{mode.emoji}</Text>
                    <Text
                      style={[
                        styles.transportChipLabel,
                        transportMode === mode.key && styles.transportChipLabelActive,
                      ]}
                    >
                      {mode.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Section>
          )}

          {/* Informations */}
          <Section label={isTransport ? "Trajet" : "Informations"}>
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
                />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
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
              label={isTransport ? "Départ" : "Lieu"}
              value={location}
              onSelect={setLocation}
              onInputFocus={handleInputFocus}
              placeholder={
                isTransport
                  ? getPlacesPlaceholderForMode(transportMode)
                  : type === "accommodation"
                  ? "Nom de l'hôtel, adresse..."
                  : "Adresse, lieu..."
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
          </Section>

          {/* Horaires / Dates */}
          <Section label={isAccommodation ? "Dates du séjour" : isTransport ? "Horaires du trajet" : "Horaires"}>
            {isTransport && durationLoading && (
              <View style={styles.durationBanner}>
                <Text style={styles.durationText}>Calcul du trajet...</Text>
              </View>
            )}
            {isTransport && durationSuggestion && !durationLoading && (
              <View style={styles.durationBanner}>
                <Text style={styles.durationText}>
                  {durationSuggestion.mode === "walking" ? "🚶" : "🚗"} Durée estimée :{" "}
                  {durationSuggestion.duration}
                </Text>
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
            ) : (
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
            )}
            {timeError && <Text style={styles.timeError}>{timeError}</Text>}
          </Section>

          {/* Prix et notes */}
          <Section label="Extras">
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
              style={[styles.input, styles.inputMultiline]}
              placeholder={isTransport ? "N° de vol, réservation... (optionnel)" : "Notes (optionnel)"}
              placeholderTextColor={colors.grayMuted}
              value={notes}
              onChangeText={setNotes}
              selectionColor={colors.rose}
              {...registerField("notes")}
              multiline
              numberOfLines={2}
            />
          </Section>

          {/* Documents */}
          <Section label="Documents">
            <DocumentList
              documents={foundItem?.documents ?? []}
              onDelete={async (docId) => {
                try {
                  await deleteDocument(docId);
                } catch (e: any) {
                  Alert.alert("Erreur", e.message || "Impossible de supprimer");
                }
              }}
            />
            <DocumentPicker
              isUploading={isUploading}
              onPick={async (file) => {
                if (!itemId) return;
                setIsUploading(true);
                try {
                  await uploadDocument(itemId, file);
                } catch (e: any) {
                  Alert.alert("Erreur", e.message || "Impossible d'envoyer le document");
                } finally {
                  setIsUploading(false);
                }
              }}
            />
          </Section>
        </ScrollView>

        {/* Save button */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleSave}
            disabled={isLoading || !!timeError}
            style={[styles.saveBtn, (isLoading || !!timeError) && styles.saveBtnDisabled]}
          >
            <Text style={styles.saveBtnText}>
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Text>
          </Pressable>
        </View>

        <LoadingOverlay visible={isLoading} />
    </KeyboardAvoidingView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.grayLight,
  },
  centerText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.gray,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayBorder,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.black,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerEmoji: {
    fontSize: 20,
  },
  headerText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    color: colors.black,
  },
  deleteText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.red,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 32,
    gap: spacing.md,
  },

  // Section
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xs,
    color: colors.grayMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
  },
  sectionBody: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow.sm,
  },

  // Type selector
  typeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.grayBorder,
    backgroundColor: colors.grayLight,
  },
  typeChipEmoji: {
    fontSize: 16,
  },
  typeChipLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
  },

  // Transport mode
  transportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  transportChip: {
    width: "22%",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.grayBorder,
    backgroundColor: colors.grayLight,
  },
  transportChipActive: {
    borderColor: colors.orange,
    backgroundColor: "rgba(224, 121, 18, 0.08)",
  },
  transportChipEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  transportChipLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xxs,
    color: colors.grayMuted,
  },
  transportChipLabelActive: {
    color: colors.orange,
  },

  // Inputs
  input: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.black,
    backgroundColor: colors.grayLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.grayBorder,
  },
  inputMultiline: {
    minHeight: 56,
    textAlignVertical: "top",
  },

  // Duration banner
  durationBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(224, 121, 18, 0.08)",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
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
    paddingVertical: spacing.xs,
    marginLeft: spacing.sm,
  },
  durationApplyText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xs,
    color: colors.white,
  },

  // Time row
  timeRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  timeHalf: {
    flex: 1,
  },
  timeError: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.red,
  },

  // Footer
  footer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.grayBorder,
  },
  saveBtn: {
    backgroundColor: colors.rose,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.3,
  },
  saveBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    color: colors.white,
  },
});
