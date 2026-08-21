import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';

// Ordered lead-first: the three load-bearing paid features (Fantasy Wishes,
// Sensate Focus, Fire+Desire challenges) go up top per Aug 2026 review —
// they're the ones that earn a subscription on their own. Spicy content
// unlocks and Activity Cards ride mid-list as good add-ons. Blueprint is
// filler (one-time use) so it goes last.
const FEATURES = [
  { emoji: '✨', title: 'Fantasy Wishes', desc: '290+ scenarios, revealed only when you both say yes to the same one' },
  { emoji: '🫁', title: 'Sensate Focus', desc: 'Guided 3-stage sessions from sex therapy practice, at your own pace' },
  { emoji: '🎲', title: 'Fire & Desire challenges', desc: '30 days of committed prompts to reignite what habit has softened' },
  { emoji: '📸', title: 'Tease', desc: '24-hour photos, videos, and voice notes for the two of you. Gone by morning.' },
  { emoji: '🎴', title: 'Activity Cards', desc: '25 cards a month, take turns drawing what you do together next' },
  { emoji: '🌶️', title: 'Spicy content everywhere', desc: 'Explicit truths, dares, daily picks, and Would You Rather unlocked across the app' },
  { emoji: '🧬', title: 'The Lovers quiz', desc: 'Find out how you each experience pleasure, and what to reach for when you drift apart' },
];

export default function UpgradeScreen() {
  useTrackScreen('upgrade');
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>💝</Text>
          <Text style={styles.heroTitle}>Love Desire Premium</Text>
          <Text style={styles.heroSub}>Everything that keeps intimacy from going on autopilot</Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.desc}</Text>
              </View>
              <Text style={styles.check}>✓</Text>
            </View>
          ))}
        </View>

        <View style={styles.pricingCard}>
          <Text style={styles.pricingTitle}>Coming soon</Text>
          <Text style={styles.pricingDesc}>
            Subscriptions are being set up. Premium features will be available shortly.
          </Text>
        </View>

        <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.85} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.upgradeBtnText}>Got it →</Text>
        </TouchableOpacity>

        <Text style={styles.note}>One subscription covers both partners</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, alignItems: 'flex-end' },
  close: { padding: Spacing.sm },
  closeText: { fontFamily: Fonts.body, fontSize: 18, color: Colors.muted },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },

  hero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  heroEmoji: { fontSize: 56 },
  heroTitle: { fontFamily: Fonts.heading, fontSize: 36, color: Colors.burgundy },
  heroSub: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, textAlign: 'center' },

  featureList: { gap: Spacing.sm },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  featureEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  featureSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  check: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.burgundy },

  pricingCard: {
    backgroundColor: Colors.blush, borderRadius: Radius.xl,
    padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
  },
  pricingTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },
  pricingDesc: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },

  upgradeBtn: {
    backgroundColor: Colors.burgundy, paddingVertical: Spacing.lg,
    borderRadius: Radius.full, alignItems: 'center',
  },
  upgradeBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },
  note: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },
});
