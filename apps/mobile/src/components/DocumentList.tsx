import { View, Text, Image, Pressable, StyleSheet, Linking, Alert } from "react-native";
import { colors, fonts, fontSize, spacing, radius } from "../theme";
import type { Document } from "../stores/tripStore";

interface DocumentListProps {
  documents: Document[];
  onDelete?: (id: string) => void;
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  if (!documents.length) return null;

  const handlePress = (doc: Document) => {
    Linking.openURL(doc.fileUrl).catch(() => {});
  };

  const handleLongPress = (doc: Document) => {
    if (!onDelete) return;
    Alert.alert("Supprimer ce document ?", doc.fileName, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => onDelete(doc.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Documents ({documents.length})</Text>
      <View style={styles.grid}>
        {documents.map((doc) => (
          <Pressable
            key={doc.id}
            onPress={() => handlePress(doc)}
            onLongPress={() => handleLongPress(doc)}
            style={styles.item}
          >
            {doc.fileType.startsWith("image/") ? (
              <Image source={{ uri: doc.fileUrl }} style={styles.thumbnail} />
            ) : (
              <View style={styles.fileIcon}>
                <Text style={styles.fileIconText}>PDF</Text>
              </View>
            )}
            <Text style={styles.fileName} numberOfLines={1}>
              {doc.fileName}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  item: { width: 80, alignItems: "center" },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.grayLight,
  },
  fileIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 56, 92, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: colors.rose,
  },
  fileName: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xxs,
    color: colors.gray,
    marginTop: 4,
    textAlign: "center",
  },
});
