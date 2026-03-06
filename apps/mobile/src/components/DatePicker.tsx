import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { colors, fonts, fontSize, radius, spacing } from "../theme";

interface DatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
  minimumDate?: string; // YYYY-MM-DD
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function toDateObj(dateStr: string): Date {
  if (!dateStr) return new Date();
  return new Date(dateStr + "T00:00:00");
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = "Sélectionner",
  minimumDate,
}: DatePickerProps) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(toDateObj(value));

  const open = () => {
    setTempDate(toDateObj(value));
    setShow(true);
  };

  const confirm = () => {
    onChange(toYMD(tempDate));
    setShow(false);
  };

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
      if (selectedDate) onChange(toYMD(selectedDate));
      return;
    }
    if (selectedDate) setTempDate(selectedDate);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={open}>
        <Text style={[styles.fieldText, !value && styles.placeholder]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
      </Pressable>

      {Platform.OS === "ios" ? (
        <Modal visible={show} transparent animationType="fade">
          <Pressable style={styles.overlay} onPress={() => setShow(false)}>
            <Pressable style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setShow(false)}>
                  <Text style={styles.sheetCancel}>Annuler</Text>
                </Pressable>
                <Text style={styles.sheetTitle}>{label}</Text>
                <Pressable onPress={confirm}>
                  <Text style={styles.sheetConfirm}>OK</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                locale="fr-FR"
                style={styles.picker}
                {...(minimumDate ? { minimumDate: toDateObj(minimumDate) } : {})}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        show && (
          <DateTimePicker
            value={toDateObj(value)}
            mode="date"
            display="calendar"
            onChange={handleChange}
            locale="fr-FR"
            {...(minimumDate ? { minimumDate: toDateObj(minimumDate) } : {})}
          />
        )
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
    fontSize: fontSize.sm,
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  field: {
    borderWidth: 1,
    borderColor: colors.grayBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
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
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayBorder,
  },
  sheetTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    color: colors.black,
  },
  sheetCancel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  sheetConfirm: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
    color: colors.rose,
  },
  picker: {
    height: 200,
  },
});
