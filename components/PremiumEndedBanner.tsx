import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

// One quiet line at the top of a paid screen in read-only mode (see
// hooks/usePaidAccess.ts). Same lavender banner shape as Fantasy Wishes'
// info line. No lock icon: the data on the screen belongs to the couple.
export function PremiumEndedBanner() {
  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => router.push('/upgrade' as any)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Premium has ended. Everything you saved is still yours. Tap to renew."
    >
      <Text style={styles.text}>Premium has ended. Everything you saved is still yours; new entries need Premium. Tap to renew.</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.sm, backgroundColor: '#F3E5F5', borderRadius: Radius.md, padding: Spacing.sm },
  text: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: '#6A1B9A', textAlign: 'center' },
});
