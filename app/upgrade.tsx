import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { PRICING, fmtUsd, annualPerMonthUsd, annualDiscountPct, trialEndLabel } from '../constants/pricing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { useToast } from '../components/Toast';

// Two-tier framing (Aug 2026 review): three deep features earn a
// subscription on their own — surfaced up top with prominent styling.
// The rest come along in an "and everything else" section so the
// paywall reads as "buying 3 flagship depth features + 4 more" instead
// of "buying 7 equivalent items". Same 7 items, cleaner mental model.
const FLAGSHIP_FEATURES = [
  { emoji: '✨', title: 'Fantasy Wishes', desc: '390+ scenarios for the two of you, revealed only when you both say yes to the same one' },
  { emoji: '🫁', title: 'Sensate Focus', desc: 'Guided 3-stage sessions from sex therapy practice, at your own pace' },
  { emoji: '🎲', title: 'Fire & Desire challenges', desc: '30 days of committed prompts to reignite what habit has softened' },
];

const ACCESSORY_FEATURES = [
  { emoji: '📸', title: 'Tease', desc: '24-hour photos, videos, and voice notes for the two of you. Gone by morning.' },
  { emoji: '🎴', title: 'Activity Cards', desc: '25 cards a month, take turns drawing what you do together next' },
  { emoji: '🌶️', title: 'Spicy content everywhere', desc: 'Explicit truths, dares, daily picks, and Would You Rather unlocked across the app' },
  { emoji: '🧬', title: 'The Lovers quiz', desc: 'Find out how you each experience pleasure, and what to reach for when you drift apart' },
];

// Billing honesty (Sep 2026, USER_VOICE A3): the price, the trial end date
// and the renewal are written out before the button, and the button says
// what happens. Trial and billing anger is the angriest cluster in the
// review mining (448 negative reviews across 13 apps): price not shown,
// yearly charged when monthly was meant, no warning before the trial ends.
// Prices come from constants/pricing.ts until RevenueCat is wired; the live
// StoreKit price then slots into the same sentences.
type Plan = 'yearly' | 'monthly';

export default function UpgradeScreen() {
  useTrackScreen('upgrade');
  const [plan, setPlan] = useState<Plan>('yearly');
  const { toast, showToast } = useToast();
  const renewal = plan === 'yearly'
    ? `${fmtUsd(PRICING.annualUsd)} a year`
    : `${fmtUsd(PRICING.introFirstMonthUsd)} for the first month, then ${fmtUsd(PRICING.monthlyUsd)} a month`;

  const handleStart = () => {
    // RevenueCat: purchase the package for `plan` here (launch blocker in
    // LAUNCH_STATUS). Until then the button is honest about the state.
    showToast('Subscriptions open at launch. Everything free stays free.');
  };

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

        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionHeader}>The three deep features</Text>
        </View>
        <View style={styles.featureList}>
          {FLAGSHIP_FEATURES.map((f, i) => (
            <View key={`fl${i}`} style={[styles.featureRow, styles.featureRowFlagship]}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.desc}</Text>
              </View>
              <Text style={styles.check}>✓</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionHeaderMuted}>And everything else that comes with it</Text>
        </View>
        <View style={styles.featureList}>
          {ACCESSORY_FEATURES.map((f, i) => (
            <View key={`ac${i}`} style={[styles.featureRow, styles.featureRowAccessory]}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitleMuted}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.desc}</Text>
              </View>
              <Text style={styles.checkMuted}>✓</Text>
            </View>
          ))}
        </View>

        <View style={styles.pricingCard}>
          <TouchableOpacity
            style={[styles.planRow, plan === 'yearly' && styles.planRowSelected]}
            onPress={() => setPlan('yearly')}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ selected: plan === 'yearly' }}
          >
            <View style={styles.planText}>
              <Text style={styles.planTitle}>Yearly</Text>
              <Text style={styles.planSub}>{fmtUsd(annualPerMonthUsd)} a month, save {annualDiscountPct}%</Text>
            </View>
            <Text style={styles.planPrice}>{fmtUsd(PRICING.annualUsd)} / year</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.planRow, plan === 'monthly' && styles.planRowSelected]}
            onPress={() => setPlan('monthly')}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ selected: plan === 'monthly' }}
          >
            <View style={styles.planText}>
              <Text style={styles.planTitle}>Monthly</Text>
              <Text style={styles.planSub}>First month {fmtUsd(PRICING.introFirstMonthUsd)}</Text>
            </View>
            <Text style={styles.planPrice}>{fmtUsd(PRICING.monthlyUsd)} / month</Text>
          </TouchableOpacity>

          <Text style={styles.honestyLine}>
            Free until {trialEndLabel(PRICING.trialDays)}, then {renewal}. Cancel before then and you pay nothing.
          </Text>
          <Text style={styles.honestySub}>
            Renews automatically until you cancel in your App Store or Google Play settings. One subscription covers both of you.
          </Text>
        </View>

        <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.85} onPress={handleStart} accessibilityRole="button">
          <Text style={styles.upgradeBtnText}>Start {PRICING.trialDays} days free</Text>
        </TouchableOpacity>

        <Text style={styles.note}>One subscription covers both partners</Text>
        <Text style={styles.note}>No streaks, no ads, no AI-written questions, no per-partner pricing. Cancel any time.</Text>
      </ScrollView>
      {toast}
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

  sectionHeaderWrap: { paddingTop: Spacing.sm, paddingBottom: 2 },
  sectionHeader: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.burgundy, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionHeaderMuted: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },

  featureList: { gap: Spacing.sm },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  featureRowFlagship: { backgroundColor: Colors.white, borderColor: Colors.rose, borderWidth: 1.5 },
  featureRowAccessory: { backgroundColor: Colors.blush, borderColor: Colors.border },
  featureEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  featureTitleMuted: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  featureSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  check: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.burgundy },
  checkMuted: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },

  pricingCard: {
    backgroundColor: Colors.blush, borderRadius: Radius.xl,
    padding: Spacing.md, gap: Spacing.sm,
  },
  planRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  planRowSelected: { borderColor: Colors.burgundy },
  planText: { flex: 1 },
  planTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  planSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  planPrice: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },
  honestyLine: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, textAlign: 'center', marginTop: Spacing.xs, lineHeight: 19 },
  honestySub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, textAlign: 'center', lineHeight: 18 },

  upgradeBtn: {
    backgroundColor: Colors.burgundy, paddingVertical: Spacing.lg,
    borderRadius: Radius.full, alignItems: 'center',
  },
  upgradeBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },
  note: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },
});
