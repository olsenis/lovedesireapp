import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const FEATURES = [
  { emoji: '🔥', title: 'Reignite desire', desc: 'Explicit dares, truths, and daily picks that take things further' },
  { emoji: '🧬', title: 'Discover your blueprint', desc: 'Find out how you each experience pleasure, and how to match' },
  { emoji: '🫁', title: 'Slow down and reconnect', desc: 'Guided Sensate Focus sessions from sex therapy practice' },
  { emoji: '✨', title: 'Explore safely together', desc: '290+ fantasy scenarios revealed only when you both say yes' },
  { emoji: '🌶️', title: 'Go deeper in conversation', desc: 'Spicy and Fantasy question categories unlocked' },
  { emoji: '🎲', title: 'Push your edges', desc: 'Fire and Desire 30-day programs for sexual reconnection' },
];

export default function UpgradeScreen() {
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
          <Text style={styles.heroTitle}>Desire Premium</Text>
          <Text style={styles.heroSub}>For couples who want to go further, together</Text>
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
