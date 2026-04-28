import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';

const TOGETHER = [
  { emoji: '✅', title: 'Together List',       subtitle: 'Shared to-do list — daily life, dates, intimacy & goals', route: '/todo',      bg: '#F1F8E9' },
];

const INTIMACY = [
  { emoji: '🧬', title: 'Erotic Blueprint',    subtitle: 'Discover your intimacy type & partner compatibility', route: '/blueprint', bg: '#F3E5F5' },
  { emoji: '🫁', title: 'Sensate Focus',       subtitle: 'Guided touch sessions — rekindling through presence',  route: '/sensate',   bg: '#E8F5E9' },
];

const CONNECTION = [
  { emoji: '💌', title: 'Love Notes',          subtitle: 'Timed secret messages that unlock at the right moment', route: '/notes',     bg: '#FCE4EC' },
  { emoji: '📸', title: 'Memories',            subtitle: 'Your private shared photo album',                       route: '/memories',  bg: '#FFF9C4' },
  { emoji: '⏳', title: 'Countdowns',          subtitle: 'Important dates & anniversaries',                       route: '/countdown', bg: '#E8F5E9' },
  { emoji: '🔔', title: 'Flirt Reminders',     subtitle: 'Daily nudges to keep the spark alive',                  route: '/reminders', bg: '#F3E5F5' },
];

const INSIGHTS = [
  { emoji: '💬', title: 'Love Language',       subtitle: 'Discover how you each feel most loved',                route: '/quiz',      bg: '#E3F2FD' },
  { emoji: '🌡️', title: 'Relationship Pulse',  subtitle: 'Private check-in on how things are going',             route: '/hita',      bg: '#FFF3E0' },
];

function FeatureCard({ emoji, title, subtitle, route, bg }: { emoji: string; title: string; subtitle: string; route: string; bg: string }) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bg }]}
      onPress={() => router.push(route as any)}
      activeOpacity={0.8}
    >
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function LoveScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Love</Text>
      <Text style={styles.subtitle}>Connection, intimacy & insights</Text>

      <Text style={styles.sectionLabel}>Together</Text>
      {TOGETHER.map((f) => <FeatureCard key={f.route} {...f} />)}

      <Text style={styles.sectionLabel}>Intimacy</Text>
      {INTIMACY.map((f) => <FeatureCard key={f.route} {...f} />)}

      <Text style={styles.sectionLabel}>Connection</Text>
      {CONNECTION.map((f) => <FeatureCard key={f.route} {...f} />)}

      <Text style={styles.sectionLabel}>Insights</Text>
      {INSIGHTS.map((f) => <FeatureCard key={f.route} {...f} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  container: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { fontFamily: Fonts.heading, fontSize: 40, color: Colors.burgundy },
  subtitle: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, marginBottom: Spacing.lg },
  sectionLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.sm, gap: Spacing.md, ...Shadow.sm,
  },
  cardEmoji: { fontSize: 36 },
  cardText: { flex: 1 },
  cardTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  cardSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  arrow: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.muted },
});
