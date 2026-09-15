import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

// Full-screen cover for the app lock (USER_VOICE A7). Rendered above the
// Stack and every modal, below the launch splash. `locked` shows the
// Unlock button; `covered` alone (app in the background) shows only the
// wordmark so the app switcher snapshot is blank. Nothing paints behind it.
export function AppLockOverlay({ locked, covered, onUnlock }: { locked: boolean; covered: boolean; onUnlock: () => void }) {
  if (!locked && !covered) return null;
  return (
    <View style={styles.fill} pointerEvents={locked ? 'auto' : 'none'} accessibilityViewIsModal>
      <Text style={styles.wordmark}>Love Desire</Text>
      <Text style={styles.heart}>♥</Text>
      {locked && (
        <>
          <Text style={styles.locked}>Locked</Text>
          <TouchableOpacity style={styles.btn} onPress={onUnlock} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Unlock with Face ID or your passcode">
            <Text style={styles.btnText}>Unlock</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  wordmark: { fontFamily: Fonts.heading, fontSize: 56, color: Colors.burgundy, letterSpacing: 1 },
  heart: { fontSize: 20, color: Colors.rose },
  locked: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, marginTop: Spacing.lg },
  btn: { marginTop: Spacing.sm, backgroundColor: Colors.burgundy, paddingVertical: 14, paddingHorizontal: 40, borderRadius: Radius.full },
  btnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },
});
