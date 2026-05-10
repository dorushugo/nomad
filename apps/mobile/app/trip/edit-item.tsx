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
import { MapPin, Hotel, Plane, FileText, Car, Footprints } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { fonts, fontSize, spacing, radius, shadow } from "../../src/theme";
import { useTheme } from "../../src/hooks/useTheme";
import type { ThemeColors } from "../../src/theme";
import { getTransitDuration } from "../../src/utils/directions";
import {
  transportModes,
  shouldCalculateDuration,
  getPlacesTypesForMode,
  getPlacesPlaceholderForMode,
} from "../../src/utils/transportModes";
import { DocumentPicker } from "../../src/components/DocumentPicker";
import { DocumentList } from "../../src/components/DocumentList";

const getItemTypes = (c: ThemeColors) => [
  { key: "activity" as const, icon: MapPin, label: "Activité", bg: c.roseLight, accent: c.rose },
  { key: "accommodation" as const, icon: Hotel, label: "Hébergement", bg: "rgba(66, 139, 255, 0.08)", accent: c.blue },
  { key: "transport" as const, icon: Plane, label: "Transport", bg: "rgba(224, 121, 18, 0.08)", accent: c.orange },
  { key: "note" as const, icon: FileText, label: "Note", bg: c.grayLight, accent: c.gray },
];

export default function EditItemScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { trips, updateItem, deleteItem, uploadDocument, deleteDocument, changeItemDay } = useTripStore();
  const { colors } = useTheme();
  const itemTypes = getItemTypes(colors);

  let foundItem = null;
  let foundTrip = null;
  for (const trip of trips) {
    for (const day of trip.days ?? []) {
      const match = (day.items ?? []).find((i) => i.id === itemId);
      if (match) { foundItem = match; foundTrip = trip; break; }
    }
    if (!foundItem) {
      const match = (trip.items ?? []).find((i) => i.id === itemId);
      if (match) { foundItem = match; foundTrip = trip; }
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
  const [selectedDayId, setSelectedDayId] = useState<string | null>(foundItem?.dayId ?? null);
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
    return () => { cancelled = true; };
  }, [isTransport, transportMode, location, arrivalLocation]);

  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Record<string, number>>({});
  const handleInputFocus = (y: number) => {
    setTimeout(() => scrollViewRef.current?.scrollTo({ y, animated: true }), 300);
  };
  const registerField = (name: string) => ({
    onLayout: (e: any) => { fieldOffsets.current[name] = e.nativeEvent.layout.y; },
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
      const originalDayId = foundItem?.dayId ?? null;
      if (selectedDayId !== originalDayId && foundTrip) {
        await changeItemDay(itemId, selectedDayId, foundTrip.id);
      }
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

  const styles = makeStyles(colors);

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

  const typeConfig = itemTypes.find((t) => t.key === type) || itemTypes[0];

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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <View style={styles.headerTitle}>
          <typeConfig.icon size={18} color={typeConfig.accent} />
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
        <SectionBlock label="Type" colors={colors}>
          <View style={styles.typeRow}>
            {itemTypes.map((item) => {
              const isActive = type === item.key;
              const ItemIcon = item.icon;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setType(item.key)}
                  style={[
                    styles.typeChip,
                    isActive && { backgroundColor: item.bg, borderColor: item.accent },
                  ]}
                >
                  <ItemIcon size={16} color={isActive ? item.accent : colors.grayMuted} />
                  <Text
                    style={[
                      styles.typeChipLabel,
                      { color: isActive ? item.accent : colors.grayMuted },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionBlock>

        {foundTrip && (
          <SectionBlock label="Jour" colors={colors}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
              <View style={styles.dayChips}>
                <Pressable
                  onPress={() => setSelectedDayId(null)}
                  style={[styles.dayChip, selectedDayId === null && styles.dayChipActive]}
                >
                  <Text style={[styles.dayChipText, selectedDayId === null && styles.dayChipTextActive]}>
                    💡 Idées
                  </Text>
                </Pressable>
                {(foundTrip.days ?? []).map((day) => {
                  const date = new Date(day.date);
                  const label = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
                  const isActive = selectedDayId === day.id;
                  return (
                    <Pressable
                      key={day.id}
                      onPress={() => setSelectedDayId(day.id)}
                      style={[styles.dayChip, isActive && styles.dayChipActive]}
                    >
                      <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </SectionBlock>
        )}

        {isTransport && (
          <SectionBlock label="Mode de transport" colors={colors}>
            <View style={styles.transportGrid}>
              {transportModes.map((mode) => {
                const isActive = transportMode === mode.key;
                const ModeIcon = mode.icon;
                return (
                  <Pressable
                    key={mode.key}
                    onPress={() => setTransportMode(mode.key)}
                    style={[
                      styles.transportChip,
                      isActive && styles.transportChipActive,
                    ]}
                  >
                    <ModeIcon size={22} color={isActive ? colors.orange : colors.grayMuted} />
                    <Text
                      style={[
                        styles.transportChipLabel,
                        isActive && styles.transportChipLabelActive,
                      ]}
                    >
                      {mode.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionBlock>
        )}

        <SectionBlock label={isTransport ? "Trajet" : "Informations"} colors={colors}>
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
        </SectionBlock>

        <SectionBlock label={isAccommodation ? "Dates du séjour" : isTransport ? "Horaires du trajet" : "Horaires"} colors={colors}>
          {isTransport && durationLoading && (
            <View style={styles.durationBanner}>
              <Text style={styles.durationText}>Calcul du trajet...</Text>
            </View>
          )}
          {isTransport && durationSuggestion && !durationLoading && (
            <View style={styles.durationBanner}>
              <View style={styles.durationLeft}>
                {durationSuggestion.mode === "walking"
                  ? <Footprints size={14} color={colors.orange} />
                  : <Car size={14} color={colors.orange} />}
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
                    setEndTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
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
                <DatePicker label="Check-in" value={startDate} onChange={setStartDate} placeholder="Arrivée" />
              </View>
              <View style={styles.timeHalf}>
                <DatePicker label="Check-out" value={endDate} onChange={setEndDate} placeholder="Départ" minimumDate={startDate || undefined} />
              </View>
            </View>
          ) : (
            <View style={styles.timeRow}>
              <View style={styles.timeHalf}>
                <TimePicker label={isTransport ? "Départ" : "Début"} value={startTime} onChange={setStartTime} placeholder={isTransport ? "14:30" : "09:00"} />
              </View>
              <View style={styles.timeHalf}>
                <TimePicker label={isTransport ? "Arrivée" : "Fin"} value={endTime} onChange={setEndTime} placeholder={isTransport ? "16:45" : "12:00"} />
              </View>
            </View>
          )}
          {timeError && <Text style={styles.timeError}>{timeError}</Text>}
        </SectionBlock>

        <SectionBlock label="Extras" colors={colors}>
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
        </SectionBlock>

        <SectionBlock label="Documents" colors={colors}>
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
        </SectionBlock>
      </ScrollView>

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

function SectionBlock({ label, children, colors }: { label: string; children: React.ReactNode; colors: ThemeColors }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          fontFamily: fonts.semiBold,
          fontSize: fontSize.xs,
          color: colors.grayMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          paddingHorizontal: spacing.xs,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: radius.xl,
          padding: spacing.md,
          gap: spacing.md,
          ...shadow.sm,
        }}
      >
        {children}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.grayLight,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.grayLight,
    },
    centerText: {
      fontFamily: fonts.medium,
      fontSize: fontSize.md,
      color: c.gray,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 60,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: c.white,
      borderBottomWidth: 1,
      borderBottomColor: c.grayBorder,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: c.grayLight,
      alignItems: "center",
      justifyContent: "center",
    },
    closeBtnText: {
      fontSize: 16,
      color: c.black,
    },
    headerTitle: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    headerText: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.md,
      color: c.black,
    },
    deleteText: {
      fontFamily: fonts.medium,
      fontSize: fontSize.sm,
      color: c.red,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: 32,
      gap: spacing.md,
    },
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
      borderColor: c.grayBorder,
      backgroundColor: c.grayLight,
    },
    typeChipLabel: {
      fontFamily: fonts.medium,
      fontSize: fontSize.sm,
    },
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
      borderColor: c.grayBorder,
      backgroundColor: c.grayLight,
    },
    transportChipActive: {
      borderColor: c.orange,
      backgroundColor: "rgba(224, 121, 18, 0.08)",
    },
    transportChipLabel: {
      fontFamily: fonts.medium,
      fontSize: fontSize.xxs,
      color: c.grayMuted,
    },
    transportChipLabelActive: {
      color: c.orange,
    },
    input: {
      fontFamily: fonts.regular,
      fontSize: fontSize.md,
      color: c.black,
      backgroundColor: c.grayLight,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: c.grayBorder,
    },
    inputMultiline: {
      minHeight: 56,
      textAlignVertical: "top",
    },
    durationBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(224, 121, 18, 0.08)",
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
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
      paddingVertical: spacing.xs,
      marginLeft: spacing.sm,
    },
    durationApplyText: {
      fontFamily: fonts.semiBold,
      fontSize: fontSize.xs,
      color: "#FFFFFF",
    },
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
      color: c.red,
    },
    footer: {
      backgroundColor: c.white,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 40,
      borderTopWidth: 1,
      borderTopColor: c.grayBorder,
    },
    saveBtn: {
      backgroundColor: c.rose,
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
      color: "#FFFFFF",
    },
    dayScroll: {
      marginHorizontal: -spacing.md,
    },
    dayChips: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    dayChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: c.grayBorder,
      backgroundColor: c.grayLight,
    },
    dayChipActive: {
      backgroundColor: c.rose,
      borderColor: c.rose,
    },
    dayChipText: {
      fontFamily: fonts.medium,
      fontSize: fontSize.sm,
      color: c.grayMuted,
      textTransform: "capitalize",
    },
    dayChipTextActive: {
      color: "#FFFFFF",
    },
  });
