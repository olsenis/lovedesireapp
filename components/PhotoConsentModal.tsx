import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PhotoConsentModal({ visible, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>📸</Text>
          <Text style={styles.title}>Before you upload</Text>
          <Text style={styles.body}>
            By continuing, you confirm that you are 18 or older and that you have the right to share this content, and that no one else appears in it without their consent.
          </Text>
          <Text style={styles.body}>
            Content that sexualises minors, or non-consensual intimate imagery, is strictly forbidden and reported to the authorities.
          </Text>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={onConfirm}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="I confirm and want to continue"
          >
            <Text style={styles.confirmBtnText}>I confirm, Continue →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: Colors.border },
  emoji: { fontSize: 44, textAlign: 'center' },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy, textAlign: 'center' },
  body: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 22, textAlign: 'center' },
  confirmBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.sm },
  confirmBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  cancelBtnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
});
