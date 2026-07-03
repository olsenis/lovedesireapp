import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';

// Rituals — the recurring rhythm of shared attention. Daily/weekly cadence,
// mutual reveal, mostly free tier. This is the emotional pull of the app.
const RITUALS = [
  { emoji: '🌅', title: 'Sunday Check-in',   subtitle: '5-question weekly ritual, answer privately, reveal together', route: '/state-union', bg: '#FFF0F3', paid: false },
  { emoji: '📸', title: 'Moments',           subtitle: 'Daily photo ritual · capture today together',                 route: '/moments',   bg: '#FFF9C4', paid: false },
  { emoji: '💌', title: 'Love Notes',        subtitle: 'Timed secret messages that unlock at the right moment',      route: '/notes',     bg: '#FCE4EC', paid: false },
  { emoji: '📓', title: 'Journal',           subtitle: 'Shared space for thoughts, reflections, and gratitude',       route: '/journal',   bg: '#FCE4EC', paid: false },
  { emoji: '🕰️', title: 'Time Capsules',     subtitle: 'Seal a memory now, open it years from today',                route: '/time-capsules', bg: '#FFF3E0', paid: false },
];

// Nurture — intimate exploration. Mostly paid tier, deeper commitment.
const NURTURE = [
  { emoji: '🔥', title: 'Intimacy Log',      subtitle: 'Log and reflect on your intimate moments',               route: '/intimacy-tracker', bg: '#FFF0F3', paid: true },
  { emoji: '🧬', title: 'Erotic Blueprint',  subtitle: 'Discover your intimacy type & partner compatibility',     route: '/blueprint', bg: '#F3E5F5', paid: true },
  { emoji: '🫁', title: 'Sensate Focus',     subtitle: 'Guided touch sessions, rekindling through presence',      route: '/sensate',   bg: '#E8F5E9', paid: true },
];

// Discover Yourselves — quiz-based identity + shared history. One-time
// or occasional revisit, not daily.
const DISCOVER = [
  { emoji: '📖', title: 'Our Story',         subtitle: 'Timeline of your milestones, met to married and beyond', route: '/our-story',  bg: '#FFF0F3', paid: false },
  { emoji: '💬', title: 'Love Language',     subtitle: 'Discover how you each feel most loved',                  route: '/quiz',      bg: '#E3F2FD', paid: false },
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
  emoji, title, subtitle, route, bg, paid, isSubscribed,
}: {
  emoji: string; title: string; subtitle: string; route: string; bg: string; paid: boolean; isSubscribed: boolean;
}) {
  const locked = paid && !isSubscribed;
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bg }]}
      onPress={() => router.push(locked ? '/upgrade' : route as any)}
      activeOpacity={0.8}
     accessibilityRole="button">
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      <Text style={styles.arrow}>{locked ? '🔒' : '›'}</Text>
    </TouchableOpacity>
  );
}

export default function LoveScreen() {
  const { isSubscribed } = useSubscription();
  const { profile } = useAuth();
  const intimacyLogEnabled = profile?.features?.intimacyLog ?? false;
  const nurture = NURTURE.filter(f => f.route !== '/intimacy-tracker' || intimacyLogEnabled);
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Us</Text>
      <Text style={styles.subtitle}>Your rhythm together</Text>

      <SectionDivider label="Rituals" />
      {RITUALS.map((f) => <FeatureCard key={f.route} {...f} isSubscribed={isSubscribed} />)}

      <SectionDivider label="Nurture" />
      {nurture.map((f) => <FeatureCard key={f.route} {...f} isSubscribed={isSubscribed} />)}

      <SectionDivider label="Discover yourselves" />
      {DISCOVER.map((f) => <FeatureCard key={f.route} {...f} isSubscribed={isSubscribed} />)}
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
  cardTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  cardSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  arrow: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.muted },
});
