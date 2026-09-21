import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuth } from '../hooks/useAuth';
import { MAX_PLANS, PLAN_MAX_LENGTH, SundayPlan, savePlan, getOpenPlan, getRecentPlan, resolvePlan, ideaFor } from '../services/sundayPlanService';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
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
  submitDoneForPartner,
  reactOnPartnerAnswer,
  replyOnPartnerAnswer,
} from '../services/stateUnionService';
import { notifyPartner } from '../services/notificationService';
import { ReactionRow } from '../components/ReactionRow';
import { useCurrentWeekId } from '../hooks/useCurrentWeekId';
import { Colors } from '../constants/colors';
import { WhileYouWait } from '../components/WhileYouWait';
import { personalise } from '../services/personalise';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { trackEvent } from '../services/statsService';
import { noteHappyMoment } from '../services/reviewPromptService';

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
// "A little something" card (Sep 19 2026, replaced Call it) before the
// check-in is marked complete.
type ComposeStep = 'pulse' | number | 'plan';

export default function StateUnionScreen() {
  const { user, profile } = useAuth();
  const help = useHelp('sunday-checkin');
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'Partner';
  // First name only where a row is tight (the pulse comparison wrapped its
  // labels on a narrow phone with "Oli Olsen" in every row).
  const partnerFirst = partnerName.split(' ')[0];
  const coupleId = profile?.coupleId;
  const weekId = useCurrentWeekId();
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
  // "A little something for {partner}" (services/sundayPlanService): one
  // field to start, up to MAX_PLANS. Private until I tick it as done.
  const [planDraft, setPlanDraft] = useState<string[]>(['']);
  const [ideaTaps, setIdeaTaps] = useState(0);
  // An earlier plan of mine that I have not answered for yet, loaded once
  // I have completed this week. `doneTicks` are the items I say I did.
  const [openPlan, setOpenPlan] = useState<SundayPlan | null>(null);
  const [doneTicks, setDoneTicks] = useState<Record<number, boolean>>({});
  const [savingDone, setSavingDone] = useState(false);
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
  // Rating prompt hook: fires when the reveal appears DURING this visit
  // (both flips false -> true), not when the screen opens on an already
  // revealed week, so re-opening does not inflate the happy-moment count.
  const prevBothRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevBothRef.current === null) { prevBothRef.current = both; return; }
    if (!prevBothRef.current && both) noteHappyMoment('sunday_reveal');
    prevBothRef.current = both;
  }, [both]);

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
  // answer and moves to the optional last card. Completion happens
  // from there (Skip or Save and finish).
  const handleFinishQuestions = async () => {
    if (!coupleId || typeof step !== 'number' || !draftAnswer.trim()) return;
    const textStep = step;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await submitStateUnionAnswer(coupleId, weekId, uid, textStep, draftAnswer.trim());
      setDraftAnswer('');
      setStep('plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (withPlan: boolean) => {
    if (!coupleId) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (withPlan) {
        // Private doc only. Never under couples/…: the partner could read it.
        await savePlan(uid, coupleId, weekId, planDraft, partnerName).catch(() => {});
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

  // Once I have completed this week: is there an earlier plan of mine to
  // answer for? One read of my own private doc.
  useEffect(() => {
    if (!coupleId || !uid || !iCompleted) return;
    let cancelled = false;
    getOpenPlan(uid, coupleId).then((p) => { if (!cancelled) setOpenPlan(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, [coupleId, uid, iCompleted]);

  // My newest unanswered plan, shown back to me. It used to be visible only on
  // the Monday love-language screen, so someone who forgot what they wrote had
  // nowhere obvious to look (asked on a phone, Sep 21 2026). NOT limited to
  // this ISO week: the week turns over on Sunday night, hours after the plan
  // is written, so "this week's plan" would be gone by Monday morning. Shown
  // when the screen is opened during the week (first step) and on the finished
  // screen, and hidden once the tick card below is asking about the same plan.
  // Same private doc; a list and nothing else: no counts, no ticks.
  const [recentPlan, setRecentPlan] = useState<SundayPlan | null>(null);
  useEffect(() => {
    if (!coupleId || !uid) { setRecentPlan(null); return; }
    let cancelled = false;
    getRecentPlan(uid, coupleId).then((p) => { if (!cancelled) setRecentPlan(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, [coupleId, uid, iCompleted, weekId, openPlan]);
  const showRecentPlan = !!recentPlan
    && (iCompleted || step === 'pulse')
    && !(iCompleted && openPlan && openPlan.weekId === recentPlan.weekId);

  // Only what I ticked is written where the partner can read it. Nothing
  // ticked writes nothing. Either way the plan is closed and never asked again.
  const handleSaveDone = async () => {
    if (!coupleId || !openPlan || savingDone) return;
    setSavingDone(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const done = openPlan.items.filter((_, i) => doneTicks[i]).map((t) => personalise(t, partner?.name));
      if (done.length > 0) await submitDoneForPartner(coupleId, weekId, uid, done);
      await resolvePlan(uid, openPlan.weekId, done.length);
      setOpenPlan(null);
    } finally {
      setSavingDone(false);
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      {/* Same keyboard handling as Daily: the focused field scrolls up far
          enough that Back / Save and next stay visible above the keyboard
          (Sep 2026: the buttons used to sit under it on Android). */}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={130}
        keyboardOpeningTime={0}
      >
        <Text style={styles.eyebrow}>{weekIdToLabel(weekId)}</Text>
        <Text style={styles.intro}>
          A short weekly ritual. 5 questions to keep you both close. Answer privately, reveal together. Short answers are fine, write what comes first.
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
              <TouchableOpacity
                style={[styles.primaryBtn, (!allPulseComplete || submitting) && styles.btnDisabled]}
                onPress={handleSavePulse}
                disabled={!allPulseComplete || submitting}
                accessibilityRole="button"
              >
                {submitting ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Save and reflect →</Text>}
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
                  <Text style={styles.primaryBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Save and next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryBtn, (!draftAnswer.trim() || submitting) && styles.btnDisabled]}
                  onPress={handleFinishQuestions}
                  disabled={!draftAnswer.trim() || submitting}
                  accessibilityRole="button"
                >
                  {submitting ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Next →</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ─── PHASE 1C: A little something (Sep 19 2026, replaced Call it) ─── */}
        {!iCompleted && step === 'plan' && (
          <View style={styles.card}>
            <Text style={styles.questionLabel}>Optional</Text>
            <Text style={styles.questionText}>A little something for {partnerName}</Text>
            <Text style={styles.waitHint}>
              One small thing you will do for {partnerName} before your next check-in. {partnerName} will not see this. Next time you tick what you did, and only that is shown.
            </Text>
            {planDraft.map((val, i) => (
              <TextInput
                key={i}
                style={[styles.input, { minHeight: 64, marginTop: i === 0 ? Spacing.sm : 6 }]}
                placeholder={['e.g. Bring coffee to bed on Tuesday', 'e.g. Take the bins out without being asked', 'e.g. Book the table myself'][i]}
                placeholderTextColor={Colors.muted}
                value={val}
                onChangeText={(t) => setPlanDraft((prev) => prev.map((v, j) => (j === i ? t : v)))}
                maxLength={PLAN_MAX_LENGTH}
                multiline
                // Ideas from "Need an idea?" run to a sentence; a single-line
                // field scrolled sideways and hid the start (Sep 2026).
                textAlignVertical="top"
                blurOnSubmit
                accessibilityLabel={`Something you will do for ${partnerName}`}
              />
            ))}
            <View style={[styles.actionsRow, { justifyContent: 'space-between', marginTop: 4 }]}>
              <TouchableOpacity
                onPress={() => {
                  // Fills the first empty field (or the last one) with the next idea.
                  // The pools are written with {partner}; fill the name before it lands
                  // in the field, or the plan is saved as "...with {partner}" (seen on a
                  // phone, Sep 21 2026).
                  const idea = personalise(ideaFor(partner?.loveLanguage, ideaTaps), partner?.name);
                  setIdeaTaps((n) => n + 1);
                  setPlanDraft((prev) => {
                    const at = prev.findIndex((v) => !v.trim());
                    const idx = at === -1 ? prev.length - 1 : at;
                    return prev.map((v, j) => (j === idx ? idea : v));
                  });
                }}
                accessibilityRole="button"
              >
                <Text style={styles.planLink}>Need an idea?</Text>
              </TouchableOpacity>
              {planDraft.length < MAX_PLANS && (
                <TouchableOpacity onPress={() => setPlanDraft((prev) => [...prev, ''])} accessibilityRole="button">
                  <Text style={styles.planLink}>+ Another</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Three buttons do not fit one row on a narrow phone (the primary
                shrank to unreadable, Sep 2026): Finish gets its own row. */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                onPress={() => handleComplete(planDraft.some((p) => p.trim()))}
                disabled={submitting}
                accessibilityRole="button"
              >
                {submitting ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText} numberOfLines={1}>{planDraft.some((p) => p.trim()) ? 'Save and finish ✓' : 'Finish check-in ✓'}</Text>}
              </TouchableOpacity>
            </View>
            <View style={[styles.actionsRow, { justifyContent: 'space-between' }]}>
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
                <Text style={styles.secondaryBtnText}>Skip this part</Text>
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

        {showRecentPlan && recentPlan && (
          <View style={styles.thisPlanCard}>
            <Text style={styles.thisPlanLabel}>Your little something for {partnerName} · only you see this</Text>
            {recentPlan.items.map((t, i) => (<Text key={i} style={styles.thisPlanItem}>{personalise(t, partner?.name)}</Text>))}
          </View>
        )}

        {/* ─── An earlier plan of mine: tick what happened ───
            Private to me. Ticked items become `doneForPartner` on my entry
            for this week; an unticked plan closes without a trace. */}
        {iCompleted && openPlan && (
          <View style={styles.card}>
            <Text style={styles.questionLabel}>Last time you planned</Text>
            <Text style={styles.waitHint}>Tick what you did. {partnerName} only ever sees the ticked ones.</Text>
            {openPlan.items.map((item, i) => {
              const on = !!doneTicks[i];
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.planTickRow}
                  onPress={() => setDoneTicks((prev) => ({ ...prev, [i]: !prev[i] }))}
                  activeOpacity={0.8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <View style={[styles.planTickBox, on && styles.planTickBoxOn]}>
                    {on && <Text style={styles.planTickMark}>✓</Text>}
                  </View>
                  <Text style={styles.planTickText}>{personalise(item, partner?.name)}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              // primaryBtn is flex: 1 for actionsRow; stacked here it must be
              // flex: 0 or RN 0.86 collapses the label.
              style={[styles.primaryBtn, { flex: 0, marginTop: Spacing.md }, savingDone && styles.btnDisabled]}
              onPress={handleSaveDone}
              disabled={savingDone}
              accessibilityRole="button"
            >
              {savingDone ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText} numberOfLines={1}>{openPlan.items.some((_, i) => doneTicks[i]) ? 'Save' : 'Not this time'}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ─── PHASE 3: Both completed — reveal ─── */}
        {both && partnerId && (
          <View style={styles.revealCard}>
            <Text style={styles.revealTitle}>You both checked in 💗</Text>
            <Text style={styles.revealNextHint}>See you next Sunday</Text>

            {!!partnerEntry?.doneForPartner?.length && (
              <View style={styles.doneBlock}>
                <Text style={styles.doneTitle}>🎁 {partnerName} did this for you, on purpose</Text>
                {partnerEntry.doneForPartner.map((t, i) => (
                  <Text key={i} style={styles.doneItem}>{t.replace(/\{partner\}/gi, 'you')}</Text>
                ))}
              </View>
            )}

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
                          {partnerFirst} <Text style={styles.pulseCompareNum}>{theirs}</Text>
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
                {/* A heart / one line on each other's answer (USER_VOICE C2). Mine
                    lives on my entry (reactionsOnPartner); the partner's on theirs. */}
                <ReactionRow
                  mine={{ reaction: !!myEntry?.reactionsOnPartner?.[String(i)], reply: myEntry?.repliesOnPartner?.[String(i)], replyAt: myEntry?.replyAtOnPartner?.[String(i)] }}
                  theirs={{ reaction: !!partnerEntry?.reactionsOnPartner?.[String(i)], reply: partnerEntry?.repliesOnPartner?.[String(i)], replyAt: partnerEntry?.replyAtOnPartner?.[String(i)] }}
                  partnerName={partnerName}
                  onReact={(on) => { if (coupleId) reactOnPartnerAnswer(coupleId, weekId, uid, i, on).catch(() => {}); }}
                  onReply={async (t, keepTime) => {
                    if (!coupleId) return;
                    await replyOnPartnerAnswer(coupleId, weekId, uid, i, t, keepTime);
                    const clean = t.trim();
                    if (clean) {
                      const title = `${profile?.name ?? 'Your partner'} replied 💬`;
                      notifyPartner(coupleId, uid, title, clean.slice(0, 80), { title, body: 'Open to read it.' }).catch(() => {});
                    }
                  }}
                />
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
                        {!!historyEntries[h.weekId]?.theirs?.doneForPartner?.length && (
                          <View style={styles.doneBlock}>
                            <Text style={styles.doneTitle}>🎁 {partnerName} did this for you, on purpose</Text>
                            {historyEntries[h.weekId]!.theirs!.doneForPartner!.map((t, i) => (
                              <Text key={i} style={styles.doneItem}>{t.replace(/\{partner\}/gi, 'you')}</Text>
                            ))}
                          </View>
                        )}
                        {getWeekQuestions(h).map((q, i) => {
                          const cached = historyEntries[h.weekId];
                          const mine = cached?.mine?.answers?.[String(i)] ?? '...';
                          const theirs = cached?.theirs?.answers?.[String(i)] ?? '...';
                          return (
                            <View key={i} style={styles.historyBlock}>
                              <Text style={styles.historyQ}>{q}</Text>
                              <Text style={styles.historyA}><Text style={styles.historyALabel}>You: </Text>{mine}</Text>
                              <Text style={styles.historyA}><Text style={styles.historyALabel}>{partnerName}: </Text>{theirs}</Text>
                              <ReactionRow
                                readOnly
                                compact
                                mine={{ reaction: !!cached?.mine?.reactionsOnPartner?.[String(i)], reply: cached?.mine?.repliesOnPartner?.[String(i)], replyAt: cached?.mine?.replyAtOnPartner?.[String(i)] }}
                                theirs={{ reaction: !!cached?.theirs?.reactionsOnPartner?.[String(i)], reply: cached?.theirs?.repliesOnPartner?.[String(i)], replyAt: cached?.theirs?.replyAtOnPartner?.[String(i)] }}
                                partnerName={partnerName}
                              />
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
      </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
      <HelpModal
        visible={help.visible}
        title="Sunday Check-in"
        description={`Once a week: five quick ratings and five questions. Everything stays private until you have both finished.`}
        tips={[
          `Rate the week from 1 to 5, then answer in your own words. Short is fine`,
          `When both are done, your answers appear side by side`,
          `Leave a ❤️ or a reply under an answer`,
          `The last step is optional and stays hidden from ${partnerName}`,
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
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

  thisPlanCard: { backgroundColor: Colors.blush, borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  thisPlanLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: Colors.burgundy },
  thisPlanItem: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 21 },
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
  primaryBtn: { flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.burgundy, alignItems: 'center' },
  primaryBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  btnDisabled: { opacity: 0.4 },

  waitEmoji: { fontSize: 48, textAlign: 'center' },
  waitTitle: { fontFamily: Fonts.headingItalic, fontSize: 22, color: Colors.burgundy, textAlign: 'center' },
  waitText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text, textAlign: 'center' },
  planLink: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, paddingVertical: 6 },
  planTickRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  planTickBox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: Colors.rose, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  planTickBoxOn: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  planTickMark: { color: Colors.cream, fontFamily: Fonts.bodyBold, fontSize: 14 },
  planTickText: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 21 },
  doneBlock: { backgroundColor: Colors.blush, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.md, gap: 4 },
  doneTitle: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  doneItem: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 21 },
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
