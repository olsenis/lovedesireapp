import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

interface Props {
  visible: boolean;
  title: string;
  description: string;
  tips?: string[];
  onDismiss: () => void;
  onDismissAll: () => void;
}

export function HelpModal({ visible, title, description, tips, onDismiss, onDismissAll }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>How it works</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {tips && tips.length > 0 && (
            <View style={styles.tips}>
              {tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipDot}>·</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity style={styles.gotItBtn} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.gotItText}>Got it →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissAllBtn} onPress={onDismissAll}>
            <Text style={styles.dismissAllText}>I don't need more help</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61,26,36,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    gap: Spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.blush,
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.burgundy, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },
  description: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 24 },
  tips: { gap: 6 },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipDot: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.rose, lineHeight: 22 },
  tipText: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 22 },
  gotItBtn: {
    backgroundColor: Colors.burgundy,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  gotItText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  dismissAllBtn: { alignItems: 'center', paddingVertical: Spacing.xs },
  dismissAllText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
});
