import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';

const GAMES = [
  { emoji: '🎲', title: 'Dare Wheel',          subtitle: 'Spin for Sweet, Flirty or Spicy challenges',   route: '/dare',        bg: '#FCE4EC' },
  { emoji: '💬', title: 'Questions Game',       subtitle: 'Fun, Deep, Romantic, Spicy, Therapy & Fantasy', route: '/questions-game', bg: '#E3F2FD' },
  { emoji: '🃏', title: 'Truth or Dare',        subtitle: 'Turn-based game — your partner challenges you', route: '/truth-dare',  bg: '#F3E5F5' },
  { emoji: '✨', title: 'Fantasy Wishes',       subtitle: '120 wishes from romantic to bold — only mutual Yes revealed', route: '/fantasy-wishes', bg: '#F3E5F5' },
];

const CHALLENGES = [
  { emoji: '🗓️', title: '30-Day Challenge',    subtitle: 'Reconnect, Spark, or Fire — a daily practice',  route: '/challenge',  bg: '#FFF9C4' },
  { emoji: '🎰', title: 'Date Night Roulette', subtitle: 'Let fate pick your perfect date idea',           route: '/roulette',   bg: '#E8F5E9' },
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

export default function DiscoverScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.subtitle}>Games & ideas for you two</Text>

      <Text style={styles.sectionLabel}>Games</Text>
      {GAMES.map((f) => <FeatureCard key={f.route} {...f} />)}

      <Text style={styles.sectionLabel}>Challenges</Text>
      {CHALLENGES.map((f) => <FeatureCard key={f.route} {...f} />)}
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
  cardEmoji: { fontSize: 38 },
  cardText: { flex: 1 },
  cardTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  cardSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  arrow: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.muted },
});
