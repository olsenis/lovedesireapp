import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { QUESTIONS, QUESTION_CATEGORY_CONFIG, QuestionCategory } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

const CATEGORIES: QuestionCategory[] = ['fun', 'deep', 'romantic', 'spicy'];

export default function QuestionsGameScreen() {
  const [category, setCategory] = useState<QuestionCategory>('romantic');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState<number[]>([]);

  const filtered = QUESTIONS.filter((q) => q.category === category);
  const current = filtered[index % filtered.length];
  const cfg = QUESTION_CATEGORY_CONFIG[category];

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnswered((prev) => [...prev, index]);
    setIndex((i) => (i + 1) % filtered.length);
    setFlipped(false);
  };

  const flip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFlipped((f) => !f);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Questions</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catRow}>
        {CATEGORIES.map((cat) => {
          const c = QUESTION_CATEGORY_CONFIG[cat];
          const active = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catBtn, active && { backgroundColor: c.color, borderColor: c.color }]}
              onPress={() => { setCategory(cat); setIndex(0); setFlipped(false); }}
            >
              <Text style={styles.catEmoji}>{c.emoji}</Text>
              <Text style={[styles.catLabel, active && { color: Colors.text, fontFamily: Fonts.bodyBold }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.content}>
        {/* Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: cfg.color }]}
          onPress={flip}
          activeOpacity={0.9}
        >
          {!flipped ? (
            <View style={styles.cardFront}>
              <Text style={styles.cardEmoji}>{cfg.emoji}</Text>
              <Text style={styles.cardCategory}>{cfg.label}</Text>
              <Text style={styles.cardQuestion}>{current.text}</Text>
              <Text style={styles.cardHint}>Tap to reveal</Text>
            </View>
          ) : (
            <View style={styles.cardFront}>
              <Text style={styles.cardEmoji}>💬</Text>
              <Text style={styles.cardCategory}>Answer time!</Text>
              <Text style={styles.cardQuestion}>{current.text}</Text>
              <Text style={styles.cardHint}>Each of you answer — then share</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.progress}>{(index % filtered.length) + 1} / {filtered.length}</Text>

        <TouchableOpacity style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextBtnText}>Next question →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },

  catScroll: { maxHeight: 70 },
  catRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  catEmoji: { fontSize: 16 },
  catLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  content: { flex: 1, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },

  card: {
    width: '100%', minHeight: 300, borderRadius: Radius.xl,
    padding: Spacing.xl, justifyContent: 'center',
    shadowColor: Colors.burgundy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  cardFront: { alignItems: 'center', gap: Spacing.md },
  cardEmoji: { fontSize: 48 },
  cardCategory: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  cardQuestion: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text, textAlign: 'center', lineHeight: 32 },
  cardHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, marginTop: Spacing.sm },

  progress: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  nextBtn: {
    backgroundColor: Colors.burgundy,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.full,
  },
  nextBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },
});
