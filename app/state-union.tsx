import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import {
  getWeekQuestions,
  StateUnionDoc,
  StateUnionEntry,
  PulseDimensionKey,
  getCurrentWeekId,
  subscribeStateUnion,
  subscribeStateUnionEntry,
  getStateUnionEntry,
  ensureStateUnionDoc,
  submitStateUnionAnswer,
  submitStateUnionPulse,
  markStateUnionCompleted,
  answeredCount,
  hasUserCompleted,
  bothCompleted,
  subscribeStateUnionHistory,
  getPreviousWeekId,
  submitPredictions,
  submitVerdictsOnPartner,
  MAX_PREDICTIONS,
  PREDICTION_LOOKBACK_WEEKS,
} from '../services/stateUnionService';
import { notifyPartner } from '../services/notificationService';
import { Colors } from '../constants/colors';
import { WhileYouWait } from '../components/WhileYouWait';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { trackEvent } from '../services/statsService';

function weekIdToLabel(weekId: string): string {
  // YYYY-WW → "Week WW · YYYY"
  const [year, week] = weekId.split('-');
  return `Week ${parseInt(week, 10)} · ${year}`;
}

// 5 quick dimensions asked before the text questions. Same set as the old
// standalone Pulse screen (fun/communication/closeness/sex/teamwork) so
// weeks post-merge carry the exact same signal the Pulse trend chart used
// to visualise. Merged Aug 2026.
type PulseDim = { key: PulseDimensionKey; label: string; emoji: string };
const PULSE_DIMENSIONS: PulseDim[] = [
  { key: 'fun',            label: 'Fun & Laughter',      emoji: '😄' },
  { key: 'communication',  label: 'Communication',       emoji: '💬' },
  { key: 'closeness',      label: 'Closeness',           emoji: '🕯️' },
  { key: 'sex',            label: 'Physical Intimacy',   emoji: '🔥' },
  { key: 'teamwork',       label: 'Teamwork',            emoji: '🙌' },
];

// Compose is a three-phase step-through: a single pulse screen (all 5
// dimensions on one page), the 5-question text wizard, then an optional
// predictions card (Sep 2026) before the check-in is marked complete.
type ComposeStep = 'pulse' | number | 'predictions';

export default function StateUnionScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'Partner';
  const coupleId = profile?.coupleId;
  const weekId = useMemo(() => getCurrentWeekId(), []);
  useTrackScreen('sunday_checkin');

  const [suDoc, setSuDoc] = useState<StateUnionDoc | null>(null);
  const [myEntry, setMyEntry] = useState<StateUnionEntry | null>(null);
  const [partnerEntry, setPartnerEntry] = useState<StateUnionEntry | null>(null);
  const [history, setHistory] = useState<StateUnionDoc[]>([]);
  const [historyEntries, setHistoryEntries] = useState<Record<string, { mine: StateUnionEntry | null; theirs: StateUnionEntry | null }>>({});
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<ComposeStep>('pulse');
  const [pulseDraft, setPulseDraft] = useState<Partial<Record<PulseDimensionKey, number>>>({});
  const [draftAnswer, setDraftAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  // Predictions step draft (3 slots, empty = not made).
  const [predDraft, setPredDraft] = useState<string[]>(Array.from({ length: MAX_PREDICTIONS }, () => ''));
  // Grading targets, resolved one-shot once I have completed this week
  // by looking back up to PREDICTION_LOOKBACK_WEEKS for both-completed
  // weeks (Review #11 B6). `gradeTarget` is the newest such week where
  // the partner made predictions (with my verdicts if already graded);
  // `myPredTarget` is the newest where I made predictions (with the
  // partner's verdicts if they have graded).
  type GradeTarget = { weekId: string; weeksAgo: number; partnerPredictions: string[]; myVerdicts?: Record<string, boolean> };
  type MyPredTarget = { weekId: string; weeksAgo: number; predictions: string[]; partnerVerdicts?: Record<string, boolean> };
  const [gradeTarget, setGradeTarget] = useState<GradeTarget | null>(null);
  const [myPredTarget, setMyPredTarget] = useState<MyPredTarget | null>(null);
  const [verdictDraft, setVerdictDraft] = useState<Record<string, boolean>>({});
  const [savingVerdicts, setSavingVerdicts] = useState(false);
  // Prevent the pulse-seed effect from clobbering user navigation after
  // the initial myEntry snapshot arrives. Without this, tapping "← Back"
  // from text step 0 back to pulse would immediately snap forward again.
  const pulseSeededRef = useRef(false);

  // Ensure doc exists, subscribe to it + history
  useEffect(() => {
    if (!coupleId) return;
    ensureStateUnionDoc(coupleId, weekId).catch(() => {});
    const u1 = subscribeStateUnion(coupleId, weekId, (d) => { setSuDoc(d); setLoading(false); });
    const u2 = subscribeStateUnionHistory(coupleId, setHistory);
    const u3 = subscribeStateUnionEntry(coupleId, weekId, uid, setMyEntry);
    return () => { u1(); u2(); u3(); };
  }, [coupleId, weekId, uid]);

  const myAnswered = answeredCount(suDoc, uid);
  const partnerAnswered = partnerId ? answeredCount(suDoc, partnerId) : 0;
  const iCompleted = hasUserCompleted(suDoc, uid);
  const both = !!partnerId && bothCompleted(suDoc, uid, partnerId);

  // Questions for THIS week — resolved from the doc's questionSetId
  // (persisted on creation via ensureStateUnionDoc). Legacy pre-migration
  // docs without the field fall back to set 0, the original 5.
  const weekQuestions = useMemo(() => getWeekQuestions(suDoc), [suDoc]);

  // Only subscribe to partner's entry once both have completed — firestore rules
  // deny the read otherwise. Without this gate, the listener throws permission-denied.
  useEffect(() => {
    if (!coupleId || !partnerId || !both) {
      setPartnerEntry(null);
      return;
    }
    return subscribeStateUnionEntry(coupleId, weekId, partnerId, setPartnerEntry);
  }, [coupleId, partnerId, both, weekId]);

  // Sync the draft with the saved answer when navigating between questions.
  // Depends on `step` only — depending on `myEntry` too would wipe in-progress
  // typing every time the Firestore snapshot arrives (e.g. after our own
  // submit for the previous question fires the listener). Pulse step has
  // its own draft state so we skip the text-answer sync for it.
  useEffect(() => {
    if (step === 'pulse') return;
    const saved = myEntry?.answers?.[String(step)] ?? '';
    setDraftAnswer(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Seed pulse draft + jump straight to text step 0 for returning users
  // who already completed the pulse step this week. Runs once when the
  // first myEntry snapshot arrives; subsequent snapshots (from our own
  // writes) are ignored so Back navigation to the pulse step still works.
  useEffect(() => {
    if (pulseSeededRef.current) return;
    if (myEntry === null && suDoc === null) return;
    pulseSeededRef.current = true;
    const saved = myEntry?.pulseScores ?? {};
    setPulseDraft(saved);
    const allPulseDone = PULSE_DIMENSIONS.every((d) => typeof saved[d.key] === 'number');
    if (allPulseDone && step === 'pulse') setStep(0);
  }, [myEntry, suDoc, step]);

  const allPulseComplete = PULSE_DIMENSIONS.every((d) => typeof pulseDraft[d.key] === 'number');

  const handleSavePulse = async () => {
    if (!coupleId || !allPulseComplete) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await submitStateUnionPulse(coupleId, weekId, uid, pulseDraft as Record<PulseDimensionKey, number>);
      setStep(0);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndNext = async () => {
    if (!coupleId || !draftAnswer.trim() || typeof step !== 'number') return;
    const textStep = step;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await submitStateUnionAnswer(coupleId, weekId, uid, textStep, draftAnswer.trim());
      if (textStep < weekQuestions.length - 1) {
        setStep(textStep + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Last question's "Finish" no longer completes directly: it saves the
  // answer and moves to the optional predictions card. Completion happens
  // from there (Skip or Save and finish).
  const handleFinishQuestions = async () => {
    if (!coupleId || typeof step !== 'number' || !draftAnswer.trim()) return;
    const textStep = step;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await submitStateUnionAnswer(coupleId, weekId, uid, textStep, draftAnswer.trim());
      setDraftAnswer('');
      setStep('predictions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (withPredictions: boolean) => {
    if (!coupleId) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (withPredictions) {
        await submitPredictions(coupleId, weekId, uid, predDraft);
      }
      await markStateUnionCompleted(coupleId, weekId, uid);
      trackEvent('sunday_checkin_submitted');
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

  // Once I have completed this week, walk back up to three weeks. Only
  // both-completed weeks count (checked against the history subscription,
  // no extra read), because the partner's entry is unreadable otherwise.
  // Stops at the newest week with partner predictions and the newest
  // with mine; a skipped week in between no longer orphans anything.
  useEffect(() => {
    if (!coupleId || !partnerId || !iCompleted || history.length === 0) return;
    let cancelled = false;
    (async () => {
      let grade: GradeTarget | null = null;
      let mineT: MyPredTarget | null = null;
      for (let back = 1; back <= PREDICTION_LOOKBACK_WEEKS; back++) {
        const w = getPreviousWeekId(new Date(), back);
        const h = history.find((x) => x.weekId === w);
        if (!h?.completedAt?.[uid] || !h?.completedAt?.[partnerId]) continue;
        const [theirs, mine] = await Promise.all([
          getStateUnionEntry(coupleId, w, partnerId),
          getStateUnionEntry(coupleId, w, uid),
        ]);
        if (cancelled) return;
        if (!grade && theirs?.predictions?.length) {
          grade = { weekId: w, weeksAgo: back, partnerPredictions: theirs.predictions, myVerdicts: mine?.verdictsOnPartner };
        }
        if (!mineT && mine?.predictions?.length) {
          mineT = { weekId: w, weeksAgo: back, predictions: mine.predictions, partnerVerdicts: theirs?.verdictsOnPartner };
        }
        if (grade && mineT) break;
      }
      if (cancelled) return;
      setGradeTarget(grade);
      setMyPredTarget(mineT);
      if (grade?.myVerdicts) setVerdictDraft(grade.myVerdicts);
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [coupleId, partnerId, uid, iCompleted, history]);

  const partnerPredictions = gradeTarget?.partnerPredictions ?? [];
  const verdictsSaved = !!gradeTarget?.myVerdicts;
  const allGraded = partnerPredictions.length > 0
    && partnerPredictions.every((_, i) => typeof verdictDraft[String(i)] === 'boolean');
  const agoLabel = (n: number) => (n === 1 ? 'Last week' : n === 2 ? 'Two weeks ago' : 'Three weeks ago');

  const handleSaveVerdicts = async () => {
    if (!coupleId || !gradeTarget || !allGraded || savingVerdicts) return;
    setSavingVerdicts(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await submitVerdictsOnPartner(coupleId, gradeTarget.weekId, uid, verdictDraft);
      // Verdicts live on a past week's entry, which is not subscribed;
      // reflect the save locally so the block flips to read-only.
      setGradeTarget((t) => (t ? { ...t, myVerdicts: verdictDraft } : t));
    } finally {
      setSavingVerdicts(false);
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>{weekIdToLabel(weekId)}</Text>
        <Text style={styles.intro}>
          A short weekly ritual. 5 questions to keep you both close. Answer privately, reveal together.
        </Text>

        {/* ─── PHASE 1A: Pulse step (5 quick dimensions before text) ─── */}
        {!iCompleted && step === 'pulse' && (
          <View style={styles.card}>
            <Text style={styles.questionLabel}>Quick pulse first · 30 sec</Text>
            <Text style={styles.pulseIntro}>Rate 1-5 across five dimensions. We reveal both sides once {partnerName} is done too.</Text>
            {PULSE_DIMENSIONS.map((d) => (
              <View key={d.key} style={styles.pulseDimRow}>
                <Text style={styles.pulseDimLabel}>{d.emoji}  {d.label}</Text>
                <View style={styles.pulseScoreRow}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = pulseDraft[d.key] === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[styles.pulseScoreBtn, active && styles.pulseScoreBtnActive]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setPulseDraft((prev) => ({ ...prev, [d.key]: n }));
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${d.label} ${n}`}
                      >
                        <Text style={[styles.pulseScoreText, active && styles.pulseScoreTextActive]}>{n}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            <View style={styles.actionsRow}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[styles.primaryBtn, (!allPulseComplete || submitting) && styles.btnDisabled]}
                onPress={handleSavePulse}
                disabled={!allPulseComplete || submitting}
                accessibilityRole="button"
              >
                {submitting ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText}>Save and reflect →</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── PHASE 1B: Text-question wizard (5 Gottman questions) ─── */}
        {!iCompleted && typeof step === 'number' && (
          <View style={styles.card}>
            <View style={styles.progressRow}>
              {weekQuestions.map((_, i) => (
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
            <Text style={styles.questionLabel}>Question {(step as number) + 1} of {weekQuestions.length}</Text>
            <Text style={styles.questionText}>{weekQuestions[step as number]}</Text>

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
                style={styles.secondaryBtn}
                onPress={() => {
                  if (step === 0) setStep('pulse');
                  else setStep((step as number) - 1);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryBtnText}>← Back</Text>
              </TouchableOpacity>

              {(step as number) < weekQuestions.length - 1 ? (
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
                  onPress={handleFinishQuestions}
                  disabled={!draftAnswer.trim() || submitting}
                  accessibilityRole="button"
                >
                  {submitting ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText}>Next →</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ─── PHASE 1C: Optional predictions (Sep 2026) ─── */}
        {!iCompleted && step === 'predictions' && (
          <View style={styles.card}>
            <Text style={styles.questionLabel}>Optional</Text>
            <Text style={styles.questionText}>Call it</Text>
            <Text style={styles.waitHint}>
              Up to three predictions about {partnerName} for the coming week. Hidden until the next check-in you both finish, when {partnerName} says which came true.
            </Text>
            {[
              'e.g. Will suggest sushi at least once',
              'e.g. Will fall asleep during a movie',
              'e.g. Will send a voice note before Wednesday',
            ].slice(0, MAX_PREDICTIONS).map((ph, i) => (
              <TextInput
                key={i}
                style={[styles.input, { minHeight: 44, marginTop: i === 0 ? Spacing.sm : 6 }]}
                placeholder={ph}
                placeholderTextColor={Colors.muted}
                value={predDraft[i]}
                onChangeText={(t) => setPredDraft((prev) => prev.map((v, j) => (j === i ? t : v)))}
                maxLength={100}
              />
            ))}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  const last = weekQuestions.length - 1;
                  setDraftAnswer(myEntry?.answers?.[String(last)] ?? '');
                  setStep(last);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => handleComplete(false)}
                disabled={submitting}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryBtnText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                onPress={() => handleComplete(predDraft.some((p) => p.trim()))}
                disabled={submitting}
                accessibilityRole="button"
              >
                {submitting ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText}>Finish check-in ✓</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── PHASE 2: I'm done but partner isn't ─── */}
        {iCompleted && !both && (
          <>
            <View style={styles.card}>
              <Text style={styles.waitEmoji}>💗</Text>
              <Text style={styles.waitTitle}>Done! Waiting for {partnerName}</Text>
              <Text style={styles.waitText}>
                {partnerAnswered === 0
                  ? `${partnerName} hasn't started yet`
                  : `${partnerName} has answered ${partnerAnswered} of ${weekQuestions.length}`}
              </Text>
              <Text style={styles.waitHint}>You'll see both answers side by side once {partnerName} is done.</Text>
            </View>
            <WhileYouWait />
          </>
        )}

        {/* ─── Predictions: grade the partner's, see how mine landed ───
            Renders in both PHASE 2 and PHASE 3 as its own card. Both
            targets come from the look-back effect above; grading needs
            only my completion this week (the retention hook: you finish
            this week's check-in to see how last week's calls landed). */}
        {iCompleted && partnerId && (gradeTarget || myPredTarget) && (
          <View style={styles.card}>
            {gradeTarget && partnerPredictions.length > 0 && (
              <>
                <Text style={styles.questionLabel}>{agoLabel(gradeTarget.weeksAgo)} {partnerName} predicted</Text>
                {partnerPredictions.map((p, i) => {
                  const k = String(i);
                  const v = verdictDraft[k];
                  return (
                    <View key={k} style={{ marginTop: Spacing.sm, gap: 6 }}>
                      <Text style={styles.questionText}>{p}</Text>
                      {verdictsSaved ? (
                        <Text style={styles.waitText}>{v ? '✓ Came true' : '✗ Did not'}</Text>
                      ) : (
                        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                          {([true, false] as const).map((val) => (
                            <TouchableOpacity
                              key={String(val)}
                              onPress={() => setVerdictDraft((prev) => ({ ...prev, [k]: val }))}
                              accessibilityRole="button"
                              accessibilityLabel={val ? 'Came true' : 'Did not'}
                              style={{
                                paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.full,
                                borderWidth: 1, borderColor: Colors.burgundy,
                                backgroundColor: v === val ? Colors.burgundy : 'transparent',
                              }}
                            >
                              <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 13, color: v === val ? Colors.cream : Colors.burgundy }}>
                                {val ? '✓ Came true' : '✗ Did not'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                {verdictsSaved ? (
                  <Text style={[styles.waitHint, { marginTop: Spacing.sm }]}>
                    {partnerName} called {partnerPredictions.filter((_, i) => verdictDraft[String(i)]).length} of {partnerPredictions.length}
                  </Text>
                ) : (
                  <TouchableOpacity
                    // primaryBtn is flex: 1 for actionsRow; stacked here it
                    // must be flex: 0 or RN 0.86 collapses the label.
                    style={[styles.primaryBtn, { flex: 0, marginTop: Spacing.md }, (!allGraded || savingVerdicts) && styles.btnDisabled]}
                    onPress={handleSaveVerdicts}
                    disabled={!allGraded || savingVerdicts}
                    accessibilityRole="button"
                  >
                    {savingVerdicts ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText}>Save verdicts</Text>}
                  </TouchableOpacity>
                )}
              </>
            )}

            {myPredTarget && (
              <View style={{ marginTop: gradeTarget ? Spacing.lg : 0 }}>
                <Text style={styles.questionLabel}>You predicted {agoLabel(myPredTarget.weeksAgo).toLowerCase()}</Text>
                {myPredTarget.predictions.map((p, i) => {
                  const theirs = myPredTarget.partnerVerdicts?.[String(i)];
                  return (
                    <View key={i} style={{ marginTop: Spacing.sm }}>
                      <Text style={styles.questionText}>{p}</Text>
                      <Text style={styles.waitText}>
                        {typeof theirs === 'boolean'
                          ? (theirs ? '✓ Came true' : '✗ Did not')
                          : `${partnerName} has not graded these yet`}
                      </Text>
                    </View>
                  );
                })}
                {myPredTarget.partnerVerdicts && (
                  <Text style={[styles.waitHint, { marginTop: Spacing.sm }]}>
                    You called {myPredTarget.predictions.filter((_, i) => myPredTarget.partnerVerdicts?.[String(i)]).length} of {myPredTarget.predictions.length}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* ─── PHASE 3: Both completed — reveal ─── */}
        {both && partnerId && (
          <View style={styles.revealCard}>
            <Text style={styles.revealTitle}>You both checked in 💗</Text>
            <Text style={styles.revealNextHint}>See you next Monday</Text>

            {/* Pulse comparison — only renders when BOTH sides carry pulseScores.
                Legacy weeks (pre-merge) skip this block gracefully. */}
            {myEntry?.pulseScores && partnerEntry?.pulseScores && (
              <View style={styles.pulseCompareBlock}>
                <Text style={styles.pulseCompareTitle}>Quick pulse</Text>
                {PULSE_DIMENSIONS.map((d) => {
                  const mine = myEntry.pulseScores?.[d.key];
                  const theirs = partnerEntry.pulseScores?.[d.key];
                  if (typeof mine !== 'number' || typeof theirs !== 'number') return null;
                  const gap = Math.abs(mine - theirs);
                  const matched = gap <= 1;
                  return (
                    <View key={d.key} style={styles.pulseCompareRow}>
                      <Text style={styles.pulseCompareLabel}>{d.emoji}  {d.label}</Text>
                      <View style={styles.pulseCompareRight}>
                        <Text style={styles.pulseCompareScore}>
                          You <Text style={styles.pulseCompareNum}>{mine}</Text>
                          <Text style={styles.pulseCompareSep}>  ·  </Text>
                          {partnerName} <Text style={styles.pulseCompareNum}>{theirs}</Text>
                        </Text>
                        <Text style={[styles.pulseIndicator, matched ? styles.pulseMatch : styles.pulseGap]}>
                          {matched ? '✓' : '↕'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {(myEntry?.pulseScores || partnerEntry?.pulseScores) && (
              <Text style={styles.revealSectionHeader}>Answers</Text>
            )}
            {weekQuestions.map((q, i) => (
              <View key={i} style={styles.revealBlock}>
                <Text style={styles.revealQ}>{i + 1}. {q}</Text>
                <View style={styles.revealAnswerRow}>
                  <Text style={styles.revealAnswerLabel}>You</Text>
                  <Text style={styles.revealAnswerText}>{myEntry?.answers?.[String(i)] ?? '-'}</Text>
                </View>
                <View style={[styles.revealAnswerRow, styles.revealAnswerRowAlt]}>
                  <Text style={[styles.revealAnswerLabel, styles.revealAnswerLabelAlt]}>{partnerName}</Text>
                  <Text style={styles.revealAnswerText}>{partnerEntry?.answers?.[String(i)] ?? '-'}</Text>
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
                      onPress={async () => {
                        const next = expanded ? null : h.weekId;
                        setExpandedWeek(next);
                        if (next && !historyEntries[h.weekId] && coupleId && partnerId && isBoth) {
                          const [mine, theirs] = await Promise.all([
                            getStateUnionEntry(coupleId, h.weekId, uid),
                            getStateUnionEntry(coupleId, h.weekId, partnerId),
                          ]);
                          setHistoryEntries((prev) => ({ ...prev, [h.weekId]: { mine, theirs } }));
                        }
                      }}
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
                        {getWeekQuestions(h).map((q, i) => {
                          const cached = historyEntries[h.weekId];
                          const mine = cached?.mine?.answers?.[String(i)] ?? '...';
                          const theirs = cached?.theirs?.answers?.[String(i)] ?? '...';
                          return (
                            <View key={i} style={styles.historyBlock}>
                              <Text style={styles.historyQ}>{q}</Text>
                              <Text style={styles.historyA}><Text style={styles.historyALabel}>You: </Text>{mine}</Text>
                              <Text style={styles.historyA}><Text style={styles.historyALabel}>{partnerName}: </Text>{theirs}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
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

  pulseIntro: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.sm },
  pulseDimRow: { gap: 6, marginBottom: Spacing.sm },
  pulseDimLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  pulseScoreRow: { flexDirection: 'row', gap: 6 },
  pulseScoreBtn: {
    flex: 1, paddingVertical: 12,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.cream, alignItems: 'center',
  },
  pulseScoreBtnActive: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  pulseScoreText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  pulseScoreTextActive: { color: Colors.cream },

  pulseCompareBlock: {
    backgroundColor: Colors.cream, borderRadius: Radius.md,
    padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  pulseCompareTitle: {
    fontFamily: Fonts.bodyBold, fontSize: 11, letterSpacing: 1.5,
    textTransform: 'uppercase', color: Colors.burgundy, marginBottom: 4,
  },
  pulseCompareRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4, gap: Spacing.sm,
  },
  pulseCompareLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, flex: 1 },
  pulseCompareRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulseCompareScore: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  pulseCompareNum: { fontFamily: Fonts.bodyBold, color: Colors.burgundy, fontSize: 14 },
  pulseCompareSep: { color: Colors.border },
  pulseIndicator: { fontSize: 14, fontFamily: Fonts.bodyBold, width: 18, textAlign: 'center' },
  pulseMatch: { color: '#7BB661' },
  pulseGap: { color: Colors.rose },

  revealSectionHeader: {
    fontFamily: Fonts.bodyBold, fontSize: 11, letterSpacing: 1.5,
    textTransform: 'uppercase', color: Colors.muted,
    marginTop: Spacing.sm, marginBottom: 2,
  },
  revealCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.rose, ...Shadow.sm },
  revealTitle: { fontFamily: Fonts.headingItalic, fontSize: 24, color: Colors.burgundy, textAlign: 'center', marginBottom: Spacing.xs },
  revealNextHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center', marginBottom: Spacing.sm },
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
