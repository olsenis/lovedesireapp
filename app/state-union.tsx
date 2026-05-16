import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import {
  STATE_UNION_QUESTIONS,
  StateUnionDoc,
  getCurrentWeekId,
  subscribeStateUnion,
  ensureStateUnionDoc,
  submitStateUnionAnswer,
  markStateUnionCompleted,
  answeredCount,
  hasUserCompleted,
  bothCompleted,
  subscribeStateUnionHistory,
} from '../services/stateUnionService';
import { notifyPartner } from '../services/notificationService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

function weekIdToLabel(weekId: string): string {
  // YYYY-WW → "Week WW · YYYY"
  const [year, week] = weekId.split('-');
  return `Week ${parseInt(week, 10)} · ${year}`;
}

export default function StateUnionScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'Partner';
  const coupleId = profile?.coupleId;
  const weekId = useMemo(() => getCurrentWeekId(), []);

  const [suDoc, setSuDoc] = useState<StateUnionDoc | null>(null);
  const [history, setHistory] = useState<StateUnionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  // Ensure doc exists, subscribe to it + history
  useEffect(() => {
    if (!coupleId) return;
    ensureStateUnionDoc(coupleId, weekId).catch(() => {});
    const u1 = subscribeStateUnion(coupleId, weekId, (d) => { setSuDoc(d); setLoading(false); });
    const u2 = subscribeStateUnionHistory(coupleId, setHistory);
    return () => { u1(); u2(); };
  }, [coupleId, weekId]);

  // Sync the draft with the saved answer when navigating between questions
  useEffect(() => {
    if (!suDoc) return;
    const saved = suDoc.answers?.[uid]?.[step] ?? '';
    setDraftAnswer(saved);
  }, [step, suDoc, uid]);

  const myAnswered = answeredCount(suDoc, uid);
  const partnerAnswered = partnerId ? answeredCount(suDoc, partnerId) : 0;
  const iCompleted = hasUserCompleted(suDoc, uid);
  const both = !!partnerId && bothCompleted(suDoc, uid, partnerId);

  const handleSaveAndNext = async () => {
    if (!coupleId || !draftAnswer.trim()) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await submitStateUnionAnswer(coupleId, weekId, uid, step, draftAnswer.trim());
      if (step < STATE_UNION_QUESTIONS.length - 1) {
        setStep(step + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!coupleId) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      // Save the current draft for the last question if not already saved
      if (draftAnswer.trim()) {
        await submitStateUnionAnswer(coupleId, weekId, uid, step, draftAnswer.trim());
      }
      await markStateUnionCompleted(coupleId, weekId, uid);
      notifyPartner(
        coupleId,
        uid,
        `${profile?.name ?? 'Partner'} finished the Sunday check-in 💗`,
        'Your turn to answer the 5 questions',
      ).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={Colors.burgundy} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sunday Check-in</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{weekIdToLabel(weekId)}</Text>
        <Text style={styles.intro}>
          A short weekly ritual. 5 questions to keep you both close. Answer privately, reveal together.
        </Text>

        {/* ─── PHASE 1: I haven't completed yet — show step-through ─── */}
        {!iCompleted && (
          <View style={styles.card}>
            <View style={styles.progressRow}>
              {STATE_UNION_QUESTIONS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i < myAnswered && styles.progressDotDone,
                    i === step && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.questionLabel}>Question {step + 1} of {STATE_UNION_QUESTIONS.length}</Text>
            <Text style={styles.questionText}>{STATE_UNION_QUESTIONS[step]}</Text>

            <TextInput
              style={styles.input}
              placeholder="Take your time..."
              placeholderTextColor={Colors.muted}
              value={draftAnswer}
              onChangeText={setDraftAnswer}
              multiline
              autoFocus
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, step === 0 && styles.btnDisabled]}
                onPress={() => step > 0 && setStep(step - 1)}
                disabled={step === 0}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryBtnText}>← Back</Text>
              </TouchableOpacity>

              {step < STATE_UNION_QUESTIONS.length - 1 ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, (!draftAnswer.trim() || submitting) && styles.btnDisabled]}
                  onPress={handleSaveAndNext}
                  disabled={!draftAnswer.trim() || submitting}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryBtnText}>Save and next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryBtn, (!draftAnswer.trim() || submitting) && styles.btnDisabled]}
                  onPress={handleComplete}
                  disabled={!draftAnswer.trim() || submitting}
                  accessibilityRole="button"
                >
                  {submitting ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText}>Finish check-in ✓</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ─── PHASE 2: I'm done but partner isn't ─── */}
        {iCompleted && !both && (
          <View style={styles.card}>
            <Text style={styles.waitEmoji}>💗</Text>
            <Text style={styles.waitTitle}>Done! Waiting for {partnerName}</Text>
            <Text style={styles.waitText}>
              {partnerAnswered === 0
                ? `${partnerName} hasn't started yet`
                : `${partnerName} has answered ${partnerAnswered} of ${STATE_UNION_QUESTIONS.length}`}
            </Text>
            <Text style={styles.waitHint}>You'll see both your answers side by side once they're done.</Text>
          </View>
        )}

        {/* ─── PHASE 3: Both completed — reveal ─── */}
        {both && partnerId && (
          <View style={styles.revealCard}>
            <Text style={styles.revealTitle}>You both checked in 💗</Text>
            {STATE_UNION_QUESTIONS.map((q, i) => (
              <View key={i} style={styles.revealBlock}>
                <Text style={styles.revealQ}>{i + 1}. {q}</Text>
                <View style={styles.revealAnswerRow}>
                  <Text style={styles.revealAnswerLabel}>You</Text>
                  <Text style={styles.revealAnswerText}>{suDoc?.answers?.[uid]?.[i] ?? '-'}</Text>
                </View>
                <View style={[styles.revealAnswerRow, styles.revealAnswerRowAlt]}>
                  <Text style={[styles.revealAnswerLabel, styles.revealAnswerLabelAlt]}>{partnerName}</Text>
                  <Text style={styles.revealAnswerText}>{suDoc?.answers?.[partnerId]?.[i] ?? '-'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ─── HISTORY ─── */}
        {history.length > 1 && (
          <>
            <Text style={styles.historyLabel}>Past check-ins</Text>
            {history
              .filter((h) => h.weekId !== weekId)
              .map((h) => {
                const expanded = expandedWeek === h.weekId;
                const isBoth = partnerId && bothCompleted(h, uid, partnerId);
                return (
                  <View key={h.weekId} style={styles.historyCard}>
                    <TouchableOpacity
                      style={styles.historyHeader}
                      onPress={() => setExpandedWeek(expanded ? null : h.weekId)}
                      accessibilityRole="button"
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyWeek}>{weekIdToLabel(h.weekId)}</Text>
                        <Text style={styles.historySub}>{isBoth ? 'Both completed' : 'Incomplete'}</Text>
                      </View>
                      <Text style={styles.historyChevron}>{expanded ? '▾' : '▸'}</Text>
                    </TouchableOpacity>
                    {expanded && isBoth && partnerId && (
                      <View style={styles.historyAnswers}>
                        {STATE_UNION_QUESTIONS.map((q, i) => (
                          <View key={i} style={styles.historyBlock}>
                            <Text style={styles.historyQ}>{q}</Text>
                            <Text style={styles.historyA}><Text style={styles.historyALabel}>You: </Text>{h.answers?.[uid]?.[i] ?? '-'}</Text>
                            <Text style={styles.historyA}><Text style={styles.historyALabel}>{partnerName}: </Text>{h.answers?.[partnerId]?.[i] ?? '-'}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.md },
  eyebrow: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, letterSpacing: 3, textTransform: 'uppercase', alignSelf: 'center' },
  intro: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.md },

  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },

  progressRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: Spacing.sm },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  progressDotDone: { backgroundColor: Colors.rose },
  progressDotActive: { backgroundColor: Colors.burgundy, transform: [{ scale: 1.3 }] },

  questionLabel: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: Colors.muted, textAlign: 'center' },
  questionText: { fontFamily: Fonts.headingItalic, fontSize: 22, color: Colors.burgundy, textAlign: 'center', lineHeight: 30 },

  input: {
    backgroundColor: Colors.cream, borderRadius: Radius.lg, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
    minHeight: 110, borderWidth: 1, borderColor: Colors.border, textAlignVertical: 'top',
  },

  actionsRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  secondaryBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  secondaryBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
  primaryBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.burgundy, alignItems: 'center' },
  primaryBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  btnDisabled: { opacity: 0.4 },

  waitEmoji: { fontSize: 48, textAlign: 'center' },
  waitTitle: { fontFamily: Fonts.headingItalic, fontSize: 22, color: Colors.burgundy, textAlign: 'center' },
  waitText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text, textAlign: 'center' },
  waitHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  revealCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.rose, ...Shadow.sm },
  revealTitle: { fontFamily: Fonts.headingItalic, fontSize: 24, color: Colors.burgundy, textAlign: 'center', marginBottom: Spacing.sm },
  revealBlock: { gap: 6, marginBottom: Spacing.sm },
  revealQ: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, marginBottom: 4 },
  revealAnswerRow: { backgroundColor: Colors.cream, borderRadius: Radius.md, padding: Spacing.sm, gap: 2 },
  revealAnswerRowAlt: { backgroundColor: Colors.blush },
  revealAnswerLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.muted },
  revealAnswerLabelAlt: { color: Colors.burgundy },
  revealAnswerText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },

  historyLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.lg },
  historyCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  historyWeek: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  historySub: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 2 },
  historyChevron: { fontFamily: Fonts.body, fontSize: 18, color: Colors.muted },
  historyAnswers: { padding: Spacing.md, paddingTop: 0, gap: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  historyBlock: { gap: 4 },
  historyQ: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.burgundy },
  historyA: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 19 },
  historyALabel: { fontFamily: Fonts.bodyBold, color: Colors.muted },
});
