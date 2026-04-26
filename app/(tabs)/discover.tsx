import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';

const FEATURES = [
  {
    emoji: '🎲',
    title: 'Dare Wheel',
    subtitle: 'Spin for Sweet, Flirty or Spicy challenges',
    route: '/dare',
    bg: '#FCE4EC',
  },
  {
    emoji: '🎰',
    title: 'Date Night Roulette',
    subtitle: 'Let fate pick your perfect date idea',
    route: '/roulette',
    bg: '#FFF9C4',
  },
  {
    emoji: '💬',
    title: 'Questions Game',
    subtitle: 'Fun, Deep, Romantic & Spicy card deck',
    route: '/questions-game',
    bg: '#E3F2FD',
  },
  {
    emoji: '🌹',
    title: 'Shared Wishlist',
    subtitle: 'Double-blind — only mutual Yes shows',
    route: '/wishlist',
    bg: '#F3E5F5',
  },
];

export default function DiscoverScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.subtitle}>Games & ideas for you two</Text>

      {FEATURES.map((f) => (
        <TouchableOpacity
          key={f.route}
          style={[styles.card, { backgroundColor: f.bg }]}
          onPress={() => router.push(f.route as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.cardEmoji}>{f.emoji}</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{f.title}</Text>
            <Text style={styles.cardSub}>{f.subtitle}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  container: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { fontFamily: Fonts.heading, fontSize: 40, color: Colors.burgundy },
  subtitle: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, marginBottom: Spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  cardEmoji: { fontSize: 40 },
  cardText: { flex: 1 },
  cardTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  cardSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  arrow: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.muted },
});
