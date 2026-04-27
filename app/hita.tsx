import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

const QUESTIONS = [
  { key: 'communication', label: 'Communication',       emoji: '💬' },
  { key: 'time',          label: 'Quality Time',        emoji: '⏱️' },
  { key: 'affection',     label: 'Physical Affection',  emoji: '🤗' },
  { key: 'fun',           label: 'Fun & Laughter',      emoji: '😄' },
  { key: 'support',       label: 'Feeling Supported',   emoji: '🙌' },
  { key: 'trust',         label: 'Trust & Honesty',     emoji: '🔒' },
  { key: 'intimacy',      label: 'Intimacy',            emoji: '🕯️' },
  { key: 'appreciation',  label: 'Feeling Appreciated', emoji: '⭐' },
  { key: 'growth',        label: 'Growing Together',    emoji: '🌱' },
  { key: 'overall',       label: 'Overall Happiness',   emoji: '❤️' },
];

const SCORE_LABELS = ['', 'Needs work', 'Could be better', 'It\'s okay', 'Pretty good', 'Amazing'];
const SCORE_COLORS = ['', Colors.error, '#F9A825', Colors.muted, Colors.success, Colors.burgundy];

export default function HitaScreen() {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  const allAnswered = QUESTIONS.every((q) => scores[q.key] !== undefined);
  const avg = allAnswered ? Object.values(scores).reduce((a, b) => a + b, 0) / QUESTIONS.length : 0;

  const submit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDone(true);
  };

  const getSuggestion = (): string => {
    const lowest = QUESTIONS.reduce((min, q) => (scores[q.key] ?? 5) < (scores[min.key] ?? 5) ? q : min, QUESTIONS[0]);
    const suggestions: Record<string, string> = {
      communication: "Try a 15-minute phone-free conversation tonight.",
      time: "Plan one activity together this week with no distractions.",
      affection: "Give a long hug every morning and evening for a week.",
      fun: "Do something silly together — a game, a new activity, anything.",
      support: "Ask your partner: 'What do you need from me right now?'",
      trust: "Share something vulnerable you haven't mentioned recently.",
      intimacy: "Check your Wishlist together and pick something mutual.",
      appreciation: "Tell your partner 3 specific things you noticed this week.",
      growth: "Set a small shared goal — something to work on together.",
      overall: "Spend an evening just talking — no phones, no TV.",
    };
    return suggestions[lowest.key] ?? "Take time this week for each other.";
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Relationship Pulse</Text>
        <View style={{ width: 60 }} />
      </View>

      {!done ? (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.intro}>
            Rate how things are going — privately. Use this to understand yourself, not to judge your partner.
          </Text>

          {QUESTIONS.map((q) => (
            <View key={q.key} style={styles.qCard}>
              <View style={styles.qTop}>
                <Text style={styles.qEmoji}>{q.emoji}</Text>
                <Text style={styles.qLabel}>{q.label}</Text>
                {scores[q.key] && (
                  <Text style={[styles.qScore, { color: SCORE_COLORS[scores[q.key]] }]}>
                    {SCORE_LABELS[scores[q.key]]}
                  </Text>
                )}
              </View>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = scores[q.key] === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.ratingBtn, active && { backgroundColor: SCORE_COLORS[n], borderColor: SCORE_COLORS[n] }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setScores((s) => ({ ...s, [q.key]: n })); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.ratingNum, active && { color: Colors.white }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitBtn, !allAnswered && styles.submitDisabled]}
            onPress={submit}
            disabled={!allAnswered}
          >
            <Text style={styles.submitText}>See my pulse →</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.results}>
          <Text style={styles.resultTitle}>Your Pulse</Text>
          <View style={styles.gauge}>
            <Text style={styles.gaugeNum}>{avg.toFixed(1)}</Text>
            <Text style={styles.gaugeLabel}>out of 5</Text>
          </View>

          <Text style={styles.resultMsg}>
            {avg >= 4.5 ? "Things are flourishing 🌸 Keep nurturing what you have." :
             avg >= 3.5 ? "You're in a good place 💕 Small gestures go a long way." :
             avg >= 2.5 ? "There's room to grow 🌱 Every relationship has seasons." :
                          "It's worth some attention 💬 Small steps make a real difference."}
          </Text>

          <View style={styles.suggestionBox}>
            <Text style={styles.suggestionTitle}>A gentle suggestion</Text>
            <Text style={styles.suggestionText}>{getSuggestion()}</Text>
          </View>

          <View style={styles.barList}>
            {QUESTIONS.map((q) => (
              <View key={q.key} style={styles.barRow}>
                <Text style={styles.barEmoji}>{q.emoji}</Text>
                <View style={styles.barWrap}>
                  <Text style={styles.barLabel}>{q.label}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${(scores[q.key] / 5) * 100}%`, backgroundColor: SCORE_COLORS[scores[q.key]] }]} />
                  </View>
                </View>
                <Text style={styles.barNum}>{scores[q.key]}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.retakeBtn} onPress={() => { setScores({}); setDone(false); }}>
            <Text style={styles.retakeText}>Retake ↻</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md, paddingTop: Spacing.md },
  intro: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },

  qCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  qTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qEmoji: { fontSize: 22 },
  qLabel: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text, flex: 1 },
  qScore: { fontFamily: Fonts.bodyItalic, fontSize: 12 },

  ratingRow: { flexDirection: 'row', gap: Spacing.sm },
  ratingBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.cream,
  },
  ratingNum: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.muted },

  submitBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.md },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },

  results: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg, alignItems: 'center', paddingTop: Spacing.xl },
  resultTitle: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
  gauge: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.blush,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.rose,
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  gaugeNum: { fontFamily: Fonts.heading, fontSize: 56, color: Colors.burgundy, lineHeight: 62 },
  gaugeLabel: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  resultMsg: { fontFamily: Fonts.bodyItalic, fontSize: 16, color: Colors.text, textAlign: 'center', lineHeight: 26 },

  suggestionBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    width: '100%',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.rose,
  },
  suggestionTitle: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  suggestionText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },

  barList: { width: '100%', gap: Spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barEmoji: { fontSize: 20, width: 28 },
  barWrap: { flex: 1, gap: 2 },
  barLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  barBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barNum: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text, width: 16 },

  retakeBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  retakeText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
});
