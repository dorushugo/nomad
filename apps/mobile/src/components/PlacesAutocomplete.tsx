import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { colors, fonts, fontSize, radius, spacing } from "../theme";

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
console.log("[PlacesAutocomplete] API_KEY loaded:", API_KEY ? `${API_KEY.slice(0, 10)}...` : "MISSING");

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlacesAutocompleteProps {
  label: string;
  value: string;
  onSelect: (place: string) => void;
  onSelectIata?: (iataCode: string | null) => void;
  onCountryDetected?: (flagEmoji: string) => void;
  placeholder?: string;
  types?: string;
}

function countryCodeToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

async function fetchCountryFlag(placeId: string): Promise<string | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components&language=fr&key=${API_KEY}`;
    console.log("[PlacesAutocomplete] fetching place details for country detection");
    const res = await fetch(url);
    const json = await res.json();
    const country = json.result?.address_components?.find((c: any) =>
      c.types?.includes("country")
    );
    if (country?.short_name) {
      const flag = countryCodeToFlag(country.short_name);
      console.log("[PlacesAutocomplete] detected country:", country.short_name, "→", flag);
      return flag;
    }
  } catch (error) {
    console.error("[PlacesAutocomplete] place details error:", error);
  }
  return null;
}

export function PlacesAutocomplete({
  label,
  value,
  onSelect,
  onSelectIata,
  onCountryDetected,
  placeholder = "Rechercher une ville ou un pays...",
  types = "(regions)",
}: PlacesAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPredictions([]);
    setShowResults(false);
  }, [types]);

  const search = useCallback(async (text: string) => {
    console.log("[PlacesAutocomplete] search() called with:", text);
    if (text.length < 2) {
      console.log("[PlacesAutocomplete] text too short, skipping");
      setPredictions([]);
      return;
    }

    setIsSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=${encodeURIComponent(types)}&language=fr&key=${API_KEY}`;
      console.log("[PlacesAutocomplete] fetching URL:", url.replace(API_KEY || "", "***"));
      const res = await fetch(url);
      console.log("[PlacesAutocomplete] response status:", res.status);
      const json = await res.json();
      console.log("[PlacesAutocomplete] response body:", JSON.stringify(json).slice(0, 500));
      if (json.predictions) {
        console.log("[PlacesAutocomplete] got", json.predictions.length, "predictions");
        setPredictions(json.predictions);
      } else {
        console.log("[PlacesAutocomplete] no predictions in response, status:", json.status, "error:", json.error_message);
      }
    } catch (error) {
      console.error("[PlacesAutocomplete] fetch error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [types]);

  const handleChangeText = (text: string) => {
    console.log("[PlacesAutocomplete] handleChangeText:", text);
    setQuery(text);
    setShowResults(true);
    onSelect(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 300);
  };

  const handleSelect = async (prediction: Prediction) => {
    const { main_text, secondary_text } = prediction.structured_formatting;
    const display = secondary_text ? `${main_text}, ${secondary_text}` : main_text;
    console.log("[PlacesAutocomplete] selected:", display);
    setQuery(display);
    onSelect(display);
    setPredictions([]);
    setShowResults(false);

    if (onSelectIata) {
      const iataMatch = display.match(/\(([A-Z]{3})\)/);
      onSelectIata(iataMatch ? iataMatch[1] : null);
    }

    if (onCountryDetected) {
      const flag = await fetchCountryFlag(prediction.place_id);
      if (flag) onCountryDetected(flag);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.grayMuted}
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => setShowResults(true)}
          selectionColor={colors.rose}
          autoCorrect={false}
        />
        {isSearching && (
          <ActivityIndicator
            size="small"
            color={colors.grayMuted}
            style={styles.spinner}
          />
        )}
      </View>

      {showResults && predictions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.mainText}>
                  {item.structured_formatting.main_text}
                </Text>
                {item.structured_formatting.secondary_text ? (
                  <Text style={styles.secondaryText}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                ) : null}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
    zIndex: 10,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.grayBorder,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  spinner: {
    marginRight: spacing.md,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.grayBorder,
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  mainText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.black,
  },
  secondaryText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.gray,
    marginTop: 1,
  },
  separator: {
    height: 1,
    backgroundColor: colors.grayBorder,
  },
});
