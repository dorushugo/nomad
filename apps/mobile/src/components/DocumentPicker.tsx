import * as DocPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSize, fonts, radius, spacing } from "../theme";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

interface DocumentPickerProps {
  onPick: (file: { uri: string; name: string; type: string; size: number }) => void;
  isUploading?: boolean;
}

export function DocumentPicker({ onPick, isUploading }: DocumentPickerProps) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if ((asset.fileSize ?? 0) > MAX_FILE_SIZE) {
      Alert.alert("Fichier trop volumineux", "La taille maximale est de 10 Mo.");
      return;
    }
    onPick({
      uri: asset.uri,
      name: asset.fileName ?? `photo_${Date.now()}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
      size: asset.fileSize ?? 0,
    });
  };

  const pickDocument = async () => {
    const result = await DocPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if ((asset.size ?? 0) > MAX_FILE_SIZE) {
      Alert.alert("Fichier trop volumineux", "La taille maximale est de 10 Mo.");
      return;
    }
    onPick({
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? "application/octet-stream",
      size: asset.size ?? 0,
    });
  };

  const handlePress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Annuler", "Photo", "Document"], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) pickImage();
          else if (index === 2) pickDocument();
        }
      );
    } else {
      Alert.alert("Ajouter un document", "", [
        { text: "Photo", onPress: pickImage },
        { text: "Document", onPress: pickDocument },
        { text: "Annuler", style: "cancel" },
      ]);
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={isUploading} style={styles.button}>
      <Text style={styles.buttonText}>{isUploading ? "Envoi..." : "Ajouter un document"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.grayBorder,
    borderStyle: "dashed",
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  buttonText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.gray,
  },
});
