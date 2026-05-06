import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing } from '../../constants/spacing';
import { Card } from '../../components/Card';

// Static activity suggestions, these will grow into a full screen
const ACTIVITIES = [
  { emoji: '🍳', title: 'Cook Together', description: 'Pick a new recipe and cook as a team.' },
  { emoji: '🎬', title: 'Movie Night', description: 'Take turns picking a film, no skipping!' },
  { emoji: '🚶', title: 'Sunset Walk', description: 'Leave the phones at home.' },
  { emoji: '💌', title: 'Love Letters', description: 'Write each other a handwritten note.' },
  { emoji: '🎲', title: 'Board Game', description: 'Friendly competition brings you closer.' },
  { emoji: '🌄', title: 'Day Trip', description: 'Explore somewhere new together.' },
];

export default function GamesScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Activities</Text>
      <Text style={styles.subtitle}>Ideas for quality time together</Text>

      {ACTIVITIES.map((activity) => (
        <Card key={activity.title} style={styles.activityCard}>
          <Text style={styles.emoji}>{activity.emoji}</Text>
          <View style={styles.activityText}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <Text style={styles.activityDesc}>{activity.description}</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  container: {
    paddingTop: 64,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
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
    marginBottom: Spacing.lg,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  emoji: {
    fontSize: 32,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 2,
  },
  activityDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
  },
});
