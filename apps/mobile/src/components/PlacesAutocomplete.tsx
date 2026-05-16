import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, fontSize, fonts, radius, spacing } from "../theme";
import { debugError } from "../utils/logger";

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlacesAutocompleteProps {
  label?: string;
  value: string;
  onSelect: (place: string) => void;
  onSelectIata?: (iataCode: string | null) => void;
  onCountryDetected?: (flagEmoji: string) => void;
  onInputFocus?: (y: number) => void;
  placeholder?: string;
  types?: string;
}

interface PlaceAddressComponent {
  short_name: string;
  types: string[];
}

function countryCodeToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

async function fetchCountryFlag(placeId: string): Promise<string | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components&language=fr&key=${API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const country = (json.result?.address_components ?? []).find((c: PlaceAddressComponent) =>
      c.types?.includes("country")
    ) as PlaceAddressComponent | undefined;
    if (country?.short_name) return countryCodeToFlag(country.short_name);
  } catch (error) {
    debugError("[PlacesAutocomplete] place details error:", error);
  }
  return null;
}

export function PlacesAutocomplete({
  label,
  value,
  onSelect,
  onSelectIata,
  onCountryDetected,
  onInputFocus,
  placeholder = "Rechercher une ville ou un pays...",
  types = "(regions)",
}: PlacesAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperY = useRef(0);

  useEffect(() => {
    setPredictions([]);
    setShowResults(false);
  }, [types]);

  const search = useCallback(
    async (text: string) => {
      if (text.length < 2) {
        setPredictions([]);
        return;
      }
      setIsSearching(true);
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=${encodeURIComponent(types)}&language=fr&key=${API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.predictions) setPredictions(json.predictions);
      } catch (error) {
        debugError("[PlacesAutocomplete] fetch error:", error);
      } finally {
        setIsSearching(false);
      }
    },
    [types]
  );

  const handleChangeText = (text: string) => {
    setQuery(text);
    setShowResults(true);
    onSelect(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 300);
  };

  const handleSelect = async (prediction: Prediction) => {
    const { main_text, secondary_text } = prediction.structured_formatting;
    const display = secondary_text ? `${main_text}, ${secondary_text}` : main_text;
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
    <View
      style={styles.wrapper}
      onLayout={(e) => {
        wrapperY.current = e.nativeEvent.layout.y;
      }}
    >
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.grayMuted}
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => {
            setShowResults(true);
            onInputFocus?.(wrapperY.current);
          }}
          selectionColor={colors.rose}
          autoCorrect={false}
        />
        {isSearching && (
          <ActivityIndicator size="small" color={colors.grayMuted} style={styles.spinner} />
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
              <Pressable style={styles.row} onPress={() => handleSelect(item)}>
                <Text style={styles.mainText}>{item.structured_formatting.main_text}</Text>
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
