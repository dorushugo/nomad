import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { colors, fonts, fontSize, radius, spacing } from "../theme";

interface TimePickerProps {
  label: string;
  value: string; // "HH:mm" or ""
  onChange: (timeStr: string) => void;
  placeholder?: string;
}

function toDateObj(timeStr: string): Date {
  const d = new Date();
  if (timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

function toHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function TimePicker({
  label,
  value,
  onChange,
  placeholder = "Sélectionner",
}: TimePickerProps) {
  const [show, setShow] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
      if (event.type === "dismissed") return;
    }
    if (selectedDate) {
      onChange(toHHMM(selectedDate));
    }
  };

  // iOS: just label + native compact picker
  if (Platform.OS === "ios") {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <DateTimePicker
          value={toDateObj(value)}
          mode="time"
          is24Hour
          display="compact"
          onChange={handleChange}
          locale="fr-FR"
          style={styles.iosPicker}
        />
      </View>
    );
  }

  // Android: custom field + dialog on press
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setShow(true)}>
        <Text style={[styles.fieldText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={toDateObj(value)}
          mode="time"
          is24Hour
          display="clock"
          onChange={handleChange}
          locale="fr-FR"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xxs,
    color: colors.darkGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  // iOS
  iosPicker: {
    alignSelf: "flex-start",
  },
  // Android
  field: {
    borderWidth: 1,
    borderColor: colors.grayBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  fieldText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.black,
  },
  placeholder: {
    color: colors.grayMuted,
  },
});
