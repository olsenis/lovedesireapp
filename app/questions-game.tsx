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
              style={[styles.catBtn, active && { backgroundColor: c.color, borderColor: Colors.border }]}
              onPress={() => { setCategory(cat); setIndex(0); setFlipped(false); }}
              activeOpacity={0.8}
            >
              <Text style={styles.catEmoji}>{c.emoji}</Text>
              <Text style={[styles.catLabel, active && { color: Colors.text, fontFamily: Fonts.bodyBold }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.content}>
        {/* Progress */}
        <View style={styles.progressWrap}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((index % filtered.length) / filtered.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{(index % filtered.length) + 1} / {filtered.length}</Text>
        </View>

        {/* Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: flipped ? Colors.white : cfg.color }]}
          onPress={flip}
          activeOpacity={0.92}
        >
          {!flipped ? (
            <View style={styles.cardFront}>
              <Text style={styles.cardEmoji}>{cfg.emoji}</Text>
              <Text style={styles.cardCategory}>{cfg.label}</Text>
              <Text style={styles.cardQuestion}>{current.text}</Text>
              <View style={styles.hintPill}>
                <Text style={styles.cardHint}>Tap to discuss</Text>
              </View>
            </View>
          ) : (
            <View style={styles.cardFront}>
              <Text style={styles.cardEmoji}>💬</Text>
              <Text style={styles.cardCategory}>Answer time!</Text>
              <Text style={styles.cardQuestion}>{current.text}</Text>
              <View style={styles.hintPill}>
                <Text style={styles.cardHint}>Each of you answer — then share</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },

  catScroll: { maxHeight: 72, flexGrow: 0 },
  catRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center' },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catEmoji: { fontSize: 17 },
  catLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },

  progressWrap: { width: '100%', gap: 6 },
  progressBar: { height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.burgundy, borderRadius: 3 },
  progressText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, textAlign: 'right' },

  card: {
    width: '100%',
    minHeight: 320,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    justifyContent: 'center',
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardFront: { alignItems: 'center', gap: Spacing.md },
  cardEmoji: { fontSize: 52 },
  cardCategory: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  cardQuestion: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.text, textAlign: 'center', lineHeight: 34 },
  hintPill: {
    marginTop: Spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(136,14,79,0.08)',
  },
  cardHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.burgundy },

  nextBtn: {
    backgroundColor: Colors.burgundy,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.full,
  },
  nextBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },
});
