import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useCouple } from '../../hooks/useCouple';
import { useSubscription } from '../../hooks/useSubscription';
import { personalise } from '../../services/personalise';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';
import { useTrackScreen } from '../../hooks/useTrackScreen';

// Rituals — the recurring rhythm of shared attention. Daily/weekly cadence,
// mutual reveal, mostly free tier. This is the emotional pull of the app.
const RITUALS = [
  { emoji: '🌅', title: 'Sunday Check-in',   subtitle: '5-question weekly ritual, answer privately, reveal together', route: '/state-union', bg: '#FFF0F3', paid: false },
  { emoji: '📸', title: 'Moments',           subtitle: 'Daily photo ritual · capture today together',                 route: '/moments',   bg: '#FFF9C4', paid: false },
  { emoji: '💌', title: 'Love Notes',        subtitle: 'Timed secret messages that unlock at the right moment',      route: '/notes',     bg: '#FCE4EC', paid: false },
  // Journal removed August 2026 — shared-journaling has notoriously low
  // retention in couples apps (solo journal is already <5% weekly active
  // after 30 days; "partner will read this" adds performance anxiety on
  // top). Sunday Check-in already carries the reflection/gratitude value
  // with a mutual-reveal mechanic that Journal lacked. Can revisit post-
  // launch if analytics show demand.
  // Time Capsules removed July 2026 — abstract long-timeline payoff didn't
  // demo well at launch; can revisit post-launch if users request "sealed
  // for later" mechanics with concrete use cases.
];

// Nurture — intimate exploration. Mostly paid tier, deeper commitment.
// `inPerson: true` flags features that inherently require being in the
// same room. LDR pairs get a small "in-person" pill so they know upfront
// this is for when they're together, but the feature stays fully
// accessible (they can plan for the next visit).
const NURTURE = [
  { emoji: '🔥', title: 'Intimacy Log',      subtitle: 'Log and reflect on your intimate moments',               route: '/intimacy-tracker', bg: '#FFF0F3', paid: true },
  { emoji: '🧬', title: 'The Lovers',        subtitle: 'Discover your intimacy type & partner compatibility',     route: '/blueprint', bg: '#F3E5F5', paid: true },
  { emoji: '🫁', title: 'Sensate Focus',     subtitle: 'Guided touch sessions, rekindling through presence',      route: '/sensate',   bg: '#E8F5E9', paid: true, inPerson: true },
];

// Discover Yourselves — quiz-based identity + shared history. One-time
// or occasional revisit, not daily.
const DISCOVER = [
  { emoji: '📖', title: 'Our Story',         subtitle: 'Timeline of your milestones, met to married and beyond', route: '/our-story',          bg: '#FFF0F3', paid: false },
  { emoji: '💬', title: 'Love Language',     subtitle: 'Discover how you each feel most loved',                  route: '/quiz',               bg: '#E3F2FD', paid: false },
  { emoji: '💕', title: "Speak {partner}'s language", subtitle: "3 fresh ways every week to speak {partner}'s language", route: '/love-language-nudge', bg: '#FCE4EC', paid: false },
];

// Same divider shape as Home ("─── LABEL ───") so the two hubs share a visual
// language and section changes read as sibling rhythm rather than drift.
function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function FeatureCard({
  emoji, title, subtitle, route, bg, paid, isSubscribed, inPerson, isLDR,
}: {
  emoji: string; title: string; subtitle: string; route: string; bg: string; paid: boolean; isSubscribed: boolean; inPerson?: boolean; isLDR?: boolean;
}) {
  const locked = paid && !isSubscribed;
  const showInPersonPill = !!inPerson && !!isLDR;
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bg }]}
      onPress={() => router.push(locked ? '/upgrade' : route as any)}
      activeOpacity={0.8}
     accessibilityRole="button">
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={styles.cardText}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          {showInPersonPill && (
            <View style={styles.inPersonPill}>
              <Text style={styles.inPersonPillText}>IN-PERSON</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      <Text style={styles.arrow}>{locked ? '🔒' : '›'}</Text>
    </TouchableOpacity>
  );
}

export default function LoveScreen() {
  const { isSubscribed } = useSubscription();
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const isLDR = !!couple?.isLongDistance;
  useTrackScreen('us');
  const intimacyLogEnabled = profile?.features?.intimacyLog ?? false;
  const nurture = NURTURE.filter(f => f.route !== '/intimacy-tracker' || intimacyLogEnabled);
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Us</Text>
      <Text style={styles.subtitle}>Your rhythm together</Text>

      <SectionDivider label="Rituals" />
      {RITUALS.map((f) => <FeatureCard key={f.route} {...f} title={personalise(f.title, partner?.name)} subtitle={personalise(f.subtitle, partner?.name)} isSubscribed={isSubscribed} isLDR={isLDR} />)}

      <SectionDivider label="Nurture" />
      {nurture.map((f) => <FeatureCard key={f.route} {...f} title={personalise(f.title, partner?.name)} subtitle={personalise(f.subtitle, partner?.name)} isSubscribed={isSubscribed} isLDR={isLDR} />)}

      <SectionDivider label="Discover yourselves" />
      {DISCOVER.map((f) => <FeatureCard key={f.route} {...f} title={personalise(f.title, partner?.name)} subtitle={personalise(f.subtitle, partner?.name)} isSubscribed={isSubscribed} isLDR={isLDR} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  container: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { fontFamily: Fonts.heading, fontSize: 40, color: Colors.burgundy },
  subtitle: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, marginBottom: Spacing.lg },
  // Shared with Home's Tonight's Picks / Tonight's Ritual dividers so hub
  // transitions read as the same visual language.
  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Spacing.lg, marginBottom: Spacing.md },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.muted, letterSpacing: 2.5, textTransform: 'uppercase' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.sm, gap: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(136,14,79,0.08)',
    ...Shadow.sm,
  },
  cardEmoji: { fontSize: 36 },
  cardText: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  cardSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  arrow: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.muted },
  inPersonPill: {
    backgroundColor: 'rgba(136,14,79,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  inPersonPillText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.burgundy,
    letterSpacing: 0.8,
  },
});
