import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

// Standard confirm dialog. Replaces Alert.alert with button callbacks, which
// the project banned (CLAUDE.md) because callbacks silently fail on web and
// are flaky on iOS. Pattern is the same destructive Modal we use for the
// Delete account and Disconnect couple flows in profile.tsx.

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{message}</Text>
          <View style={styles.btns}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>{loading ? '…' : confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  modal: { backgroundColor: Colors.cream, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, ...Shadow.md },
  title: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy },
  hint: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, lineHeight: 22 },
  btns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
  confirmBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.burgundy, alignItems: 'center' },
  confirmBtnDestructive: { backgroundColor: Colors.error },
  confirmText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream },
});
