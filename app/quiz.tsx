import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { QUIZ_QUESTIONS, LOVE_LANGUAGE_LABELS, LoveLanguage } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

export default function QuizScreen() {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<LoveLanguage, number>>({ words: 0, acts: 0, gifts: 0, time: 0, touch: 0 });
  const [done, setDone] = useState(false);

  const q = QUIZ_QUESTIONS[step];

  const pick = (lang: LoveLanguage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = { ...scores, [lang]: scores[lang] + 1 };
    setScores(next);
    if (step + 1 >= QUIZ_QUESTIONS.length) {
      setDone(true);
    } else {
      setStep((s) => s + 1);
    }
  };

  const restart = () => {
    setStep(0);
    setScores({ words: 0, acts: 0, gifts: 0, time: 0, touch: 0 });
    setDone(false);
  };

  const sorted = (Object.entries(scores) as [LoveLanguage, number][]).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0][0];
  const max = sorted[0][1];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Love Language</Text>
        <View style={{ width: 60 }} />
      </View>

      {!done ? (
        <View style={styles.quizContent}>
          {/* Progress */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((step) / QUIZ_QUESTIONS.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{step + 1} of {QUIZ_QUESTIONS.length}</Text>

          <Text style={styles.question}>Which feels more meaningful to you?</Text>

          <TouchableOpacity style={styles.optionCard} onPress={() => pick(q.a.language)}>
            <Text style={styles.optionText}>{q.a.text}</Text>
          </TouchableOpacity>

          <Text style={styles.or}>or</Text>

          <TouchableOpacity style={styles.optionCard} onPress={() => pick(q.b.language)}>
            <Text style={styles.optionText}>{q.b.text}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.results}>
          <Text style={styles.resultTitle}>Your Love Language</Text>
          <Text style={styles.primaryEmoji}>{LOVE_LANGUAGE_LABELS[primary].emoji}</Text>
          <Text style={styles.primaryLabel}>{LOVE_LANGUAGE_LABELS[primary].label}</Text>
          <Text style={styles.primaryDesc}>{LOVE_LANGUAGE_LABELS[primary].description}</Text>

          <View style={styles.scoreList}>
            {sorted.map(([lang, score]) => {
              const cfg = LOVE_LANGUAGE_LABELS[lang];
              const pct = max > 0 ? (score / max) * 100 : 0;
              return (
                <View key={lang} style={styles.scoreRow}>
                  <Text style={styles.scoreEmoji}>{cfg.emoji}</Text>
                  <View style={styles.scoreBarWrap}>
                    <Text style={styles.scoreLang}>{cfg.label}</Text>
                    <View style={styles.scoreBarBg}>
                      <View style={[styles.scoreBarFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.scoreNum}>{score}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.restartBtn} onPress={restart}>
            <Text style={styles.restartText}>Retake quiz ↻</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },

  quizContent: { flex: 1, paddingHorizontal: Spacing.xl, justifyContent: 'center', gap: Spacing.lg },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.burgundy, borderRadius: 2 },
  progressText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center' },
  question: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text, textAlign: 'center', lineHeight: 32 },
  optionCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: Colors.burgundy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  optionText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.text, textAlign: 'center', lineHeight: 24 },
  or: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, textAlign: 'center' },

  results: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl, alignItems: 'center', gap: Spacing.lg },
  resultTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  primaryEmoji: { fontSize: 72 },
  primaryLabel: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.burgundy, textAlign: 'center' },
  primaryDesc: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 24 },

  scoreList: { width: '100%', gap: Spacing.md },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  scoreEmoji: { fontSize: 22, width: 32 },
  scoreBarWrap: { flex: 1, gap: 4 },
  scoreLang: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  scoreBarBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', backgroundColor: Colors.burgundy, borderRadius: 4 },
  scoreNum: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text, width: 20, textAlign: 'right' },

  restartBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  restartText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
});
