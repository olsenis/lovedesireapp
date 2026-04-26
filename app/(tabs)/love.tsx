import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';

const FEATURES = [
  { emoji: '💌', title: 'Love Notes',     subtitle: 'Timed secret messages that unlock at the right moment', route: '/notes',     bg: '#FCE4EC' },
  { emoji: '📸', title: 'Memories',       subtitle: 'Your private shared photo album',                        route: '/memories',  bg: '#FFF9C4' },
  { emoji: '⏳', title: 'Countdowns',     subtitle: 'Important dates & anniversaries',                        route: '/countdown', bg: '#E8F5E9' },
  { emoji: '🔔', title: 'Flirt Reminders',subtitle: 'Daily nudges to do something for your partner',         route: '/reminders', bg: '#F3E5F5' },
  { emoji: '💬', title: 'Love Language',  subtitle: 'Discover how you each feel most loved',                 route: '/quiz',      bg: '#E3F2FD' },
  { emoji: '🌡️', title: 'Relationship Pulse', subtitle: 'Private check-in on how things are going',          route: '/hita',      bg: '#FFF3E0' },
];

export default function LoveScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Love</Text>
      <Text style={styles.subtitle}>Nurture your connection</Text>

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
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md, gap: Spacing.md, ...Shadow.sm,
  },
  cardEmoji: { fontSize: 36 },
  cardText: { flex: 1 },
  cardTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  cardSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  arrow: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.muted },
});
