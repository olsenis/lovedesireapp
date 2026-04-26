import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing } from '../../constants/spacing';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

// Question categories for the card deck
const CATEGORIES = [
  { label: 'Fun',      emoji: '😄', color: Colors.blush },
  { label: 'Deep',     emoji: '🌊', color: '#E8F5E9' },
  { label: 'Romantic', emoji: '🌹', color: Colors.blush },
  { label: 'Spicy',    emoji: '🌶️', color: '#FFF3E0' },
];

export default function QuestionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Question Game</Text>
      <Text style={styles.subtitle}>Answer separately, reveal together</Text>

      {/* Category picker — TODO: make tappable */}
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => (
          <Card key={cat.label} style={StyleSheet.flatten([styles.catCard, { backgroundColor: cat.color }])}>
            <Text style={styles.catEmoji}>{cat.emoji}</Text>
            <Text style={styles.catLabel}>{cat.label}</Text>
          </Card>
        ))}
      </View>

      {/* TODO: Implement card deck with Reanimated swipe/flip */}
      <Button label="Start a Round" onPress={() => {}} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    paddingTop: 64,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 36,
    color: Colors.burgundy,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.bodyItalic,
    fontSize: 15,
    color: Colors.muted,
    marginBottom: Spacing.xl,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  catCard: {
    width: '46%',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderWidth: 0,
  },
  catEmoji: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  catLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.text,
  },
  button: {
    marginTop: Spacing.md,
  },
});
