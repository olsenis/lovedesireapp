import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, AppState, Platform, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useSubscription } from '../hooks/useSubscription';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { SensateProgress, subscribeSensateProgress, completeStage, submitReflection, bothReflected, completeMini } from '../services/sensateService';
import { SENSATE_PROMPT_POOLS } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { trackEvent } from '../services/statsService';

interface Stage {
  id: number;
  title: string;
  subtitle: string;
  durationMinutes: number;
  color: string;
  textColor: string;
  prompts: string[];
  instruction: string;
  // One-liner shown above the instruction on each stage card. Frames
  // "what this stage is doing" so users understand the arc.
  blurb: string;
  // Shown after "Mark session complete", before the reflection input.
  // Stage-specific invitation to talk / notice / land.
  takeaway: string;
}

const STAGES: Stage[] = [
  {
    id: 1,
    title: 'Discover',
    subtitle: 'Non-genital touch, sensation only',
    durationMinutes: 15,
    color: '#FAEEF2',
    textColor: '#A4366A',
    blurb: 'Breaking the touch-equals-goal reflex.',
    takeaway: 'Take a moment to share with each other, what did you notice about sensation without goal?',
    instruction: 'Partner A touches Partner B for 15 minutes, back, arms, face, scalp. Partner B only receives and notices. No goal. No performance. Switch when the timer ends.',
    prompts: [
      "Notice the temperature of your partner's skin.",
      'Pay attention to texture, smooth, rough, soft.',
      'There is no goal here. Just sensation.',
      'Follow what feels interesting to your hands.',
      'Breathe slowly. Stay present.',
      'Notice what you enjoy exploring.',
      'Partner B: just receive. Nothing is required of you.',
      'Move wherever your curiosity leads.',
      'Warmth. Weight. Pressure. Notice it all.',
      'You have nowhere to be. Just here.',
    ],
  },
  {
    id: 2,
    title: 'Connect',
    subtitle: 'Full body, still no goal',
    durationMinutes: 20,
    color: '#FCE4EC',
    textColor: '#880E4F',
    blurb: 'Reintroducing the sexual body without performance pressure.',
    takeaway: 'How did it feel to explore without chasing arousal?',
    instruction: 'Full body now, including intimate areas, but the rule is the same. No goal, no performance. The receiver can guide with their hand (show, don\'t tell). Switch after 20 minutes.',
    prompts: [
      'Let your hands be curious, not purposeful.',
      'The receiver can gently guide, no words needed.',
      'Notice what you want to linger on.',
      'There is nowhere to arrive. This is the whole thing.',
      'Breathe together, slowly.',
      "Pay attention to your partner's responses without chasing them.",
      'Receiver: if something feels good, let it show.',
      'Follow warmth. Follow what feels alive.',
      'This is not foreplay. This is presence.',
      'Stay slow. Slower than you think.',
    ],
  },
  {
    id: 3,
    title: 'Together',
    subtitle: 'Mutual touch, no turn-taking',
    durationMinutes: 20,
    color: '#F8C3D2',
    textColor: '#7d0a48',
    blurb: 'Mutual attention, both giving and receiving at once.',
    takeaway: 'What was different about touching and being touched at the same time?',
    instruction: 'Both of you touch each other at the same time now, no turn-taking. Full body still allowed, and the rule stays, no orgasm goal, no chasing arousal. Extended presence with mutual attention. 20 minutes.',
    prompts: [
      'Both of you touching, both of you receiving.',
      'Notice their hand as your hand moves.',
      'Let your rhythms find each other.',
      'Give and receive are the same thing now.',
      'Two bodies, one slow attention.',
      'Feel their touch and your own touch together.',
      'Move in mirror. Move in echo.',
      'There is no giver here, no receiver, only meeting.',
      'Notice where your rhythms differ, and where they meet.',
      'Both hands, both bodies, one slow field.',
    ],
  },
  {
    id: 4,
    title: 'Flow',
    subtitle: 'Mindful, no agenda',
    durationMinutes: 0,
    color: '#F4A7B9',
    textColor: '#6a0a3e',
    blurb: 'Letting whatever comes, come. Presence over agenda.',
    takeaway: 'Whatever happened tonight was welcome. Nothing needed to happen.',
    instruction: 'No timer. No goal. Move together with full sensory awareness, sensation, not performance. If arousal comes, let it be part of the experience without chasing it. Stay curious.',
    prompts: [
      'There is nothing to achieve.',
      'Follow sensation, not expectation.',
      'If arousal arrives, let it. Don\'t chase it.',
      'Stay in contact. Stay present.',
      'Move toward what feels alive.',
      'This is connection. Nothing more is needed.',
      'Breathe. Slow down.',
      'Notice what your body wants right now.',
      'Everything is welcome here.',
      'You are exactly where you should be.',
    ],
  },
];

export default function SensateScreen() {
  const { user, profile } = useAuth();
  const { couple } = useCouple(user?.uid, profile?.coupleId);
  const { isSubscribed, isLoading: subLoading } = useSubscription();
  useTrackScreen('sensate');
  // Screen-level paywall gate — Us tab card is gated but Home nudges
  // (Insight tip + "return to Sensate" nudge) route directly here and
  // could bypass the paywall for non-subscribed users.
  useEffect(() => {
    if (!subLoading && !isSubscribed) {
      trackEvent('upgrade_cta_tapped');
      router.replace('/upgrade' as any);
    }
  }, [subLoading, isSubscribed]);
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [marked, setMarked] = useState(false);
  // True when the current session is the 5-min mini variant of Stage 1
  // (Ease-boost on-ramp). Doesn't count toward cycle completion — service
  // completeMini bumps miniSessionsCompleted + lastActivityAt only.
  const [isMini, setIsMini] = useState(false);
  // Post-session reflection state — one-line reaction after "Mark complete".
  // Cleared when user leaves the active-stage view. Text stays local until
  // Save; skip = clear + hide the card.
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [reflectionSkipped, setReflectionSkipped] = useState(false);
  // Cycle number in which the current session sits — captured at session
  // start so a mid-session cycle-completion doesn't shift the reflection
  // key mid-flow. Falls back to 1 for pre-cycle-tracking docs.
  const [sessionCycleNumber, setSessionCycleNumber] = useState<number>(1);
  const [progress, setProgress] = useState<SensateProgress>({
    stage1: { count: 0, lastDate: '' },
    stage2: { count: 0, lastDate: '' },
    stage3: { count: 0, lastDate: '' },
    cyclesCompleted: 0,
    currentCycleStages: { stage1: false, stage2: false, stage3: false },
  });
  // Flips true once the Firestore subscribe has delivered its first
  // snapshot. Guards startStage so a cold-start rapid tap doesn't
  // capture a stale progress.cyclesCompleted = 0 into sessionCycleNumber,
  // which would then key reflections under cycle 1 while the partner
  // (on already-loaded state) keys them under the real cycle number →
  // bothReflected never returns true → mutual reveal never fires.
  const [progressLoaded, setProgressLoaded] = useState(false);
  // Cycle completion modal state — fires when a completeStage call fills
  // the final missing stage in the current cycle. Local-only state (no
  // need to sync across partners; each partner sees it locally when
  // their own action triggered the completion).
  const [cycleModalCount, setCycleModalCount] = useState<number | null>(null);
  const help = useHelp('presence');
  // Wall-clock timer state. `runStartMs` is when the current run leg began
  // (Date.now()); `accumulatedMs` is time from earlier legs (before the
  // most recent pause). Deriving elapsed from Date.now() means the timer
  // keeps counting even when the screen is off or the app is backgrounded.
  const [runStartMs, setRunStartMs] = useState<number | null>(null);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  // Bumps every second while running so the countdown re-renders. The
  // source of truth is still the wall clock; this just drives redraws.
  const [tick, setTick] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const promptAnim = useRef(new Animated.Value(1)).current;
  const lastPromptRotateSecRef = useRef(0);
  // Identifier for the currently scheduled completion notification (if any).
  // Kept in a ref so pause/resume/back can cancel it without waiting for
  // React re-renders.
  const scheduledNotifIdRef = useRef<string | null>(null);

  const running = runStartMs !== null;
  const elapsed = Math.floor(
    (accumulatedMs + (runStartMs !== null ? Date.now() - runStartMs : 0)) / 1000
  );

  const coupleId = profile?.coupleId;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeSensateProgress(coupleId, (p) => {
      setProgress(p);
      setProgressLoaded(true);
    });
  }, [coupleId]);

  // Deterministic seeded shuffle so both partners see the same prompt order
  // for a given cycle+stage but each new cycle rotates. Merges the baseline
  // 10 (STAGES) with the 20 extended pool (SENSATE_PROMPT_POOLS) for 30 total.
  // Cheap Fisher-Yates using a mulberry32 PRNG seeded from a string hash of
  // (coupleId + cycleNumber + stageId).
  const shuffledPrompts = useMemo(() => {
    if (!activeStage) return [];
    const stageIdKey = activeStage.id as 1 | 2 | 3 | 4;
    const pool = [...activeStage.prompts, ...(SENSATE_PROMPT_POOLS[stageIdKey] ?? [])];
    const seedStr = `${coupleId ?? 'none'}_${sessionCycleNumber}_${stageIdKey}`;
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    let a = seed || 1;
    const rand = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const arr = [...pool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [activeStage, coupleId, sessionCycleNumber]);

  const totalSeconds = (activeStage?.durationMinutes ?? 0) * 60;
  const remaining = Math.max(totalSeconds - elapsed, 0);
  const timerProgress = totalSeconds > 0 ? Math.min(elapsed / totalSeconds, 1) : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  // Redraw tick — every second while running, purely to re-render the
  // countdown. Wall-clock is authoritative, so if the tick skips (backgrounded
  // JS timer throttling on iOS), elapsed still resolves correctly on next fire.
  useEffect(() => {
    if (!running) return;
    const handle = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(handle);
  }, [running]);

  // Re-sync immediately when app returns to foreground so the countdown
  // jumps to the correct wall-clock value without waiting for the next tick.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  // Cancel any scheduled completion notification if the user closes the
  // screen mid-session, so they don't get a stale "Stage 1 complete" alert
  // 8 minutes after they navigated away.
  useEffect(() => {
    return () => { cancelCompletionNotif(); };
  }, []);

  // Prompt rotation — every 90 seconds of elapsed time. Guarded so app
  // resume doesn't fire multiple rotations at once when elapsed jumps.
  useEffect(() => {
    if (!running) return;
    const rotateAt = Math.floor(elapsed / 90);
    if (rotateAt > lastPromptRotateSecRef.current && rotateAt > 0) {
      lastPromptRotateSecRef.current = rotateAt;
      Animated.sequence([
        Animated.timing(promptAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(promptAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
      setPromptIndex((i) => (i + 1) % (shuffledPrompts.length || 1));
    }
  }, [elapsed, running, activeStage, promptAnim]);

  // Completion detection — stop the run leg and fire success haptic when
  // wall-clock elapsed reaches the stage duration. The scheduled local
  // notification handles the audible cue (works even when app is closed).
  useEffect(() => {
    if (!running || totalSeconds === 0) return;
    if (elapsed >= totalSeconds) {
      // Freeze accumulatedMs at exactly totalSeconds so the display shows 0:00.
      setAccumulatedMs(totalSeconds * 1000);
      setRunStartMs(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Local notification will have already fired at this moment, no need
      // to cancel — but clear the ref so pause/back logic stays clean.
      scheduledNotifIdRef.current = null;
    }
  }, [elapsed, running, totalSeconds]);

  // Schedule / cancel the completion notification. Web / Expo Go without
  // notification permission fail silently, which is fine — the on-screen
  // countdown still works and Haptics fires when the app is foregrounded.
  async function scheduleCompletionNotif(stage: Stage, secondsUntil: number) {
    if (Platform.OS === 'web' || secondsUntil <= 0) return;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Presence 🌸',
          body: `Stage ${stage.id}: ${stage.title} complete. Switch or rest together.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntil,
        },
      });
      scheduledNotifIdRef.current = id;
    } catch { /* permission not granted or unsupported host */ }
  }

  async function cancelCompletionNotif() {
    const id = scheduledNotifIdRef.current;
    scheduledNotifIdRef.current = null;
    if (!id || Platform.OS === 'web') return;
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already fired */ }
  }

  const startStage = (stage: Stage, mini = false) => {
    // Cancel any leftover notification from a prior stage before switching.
    cancelCompletionNotif();
    setActiveStage(stage);
    setIsMini(mini);
    setAccumulatedMs(0);
    setRunStartMs(null);
    setPromptIndex(0);
    setMarked(false);
    setReflectionText('');
    setReflectionSaved(false);
    setReflectionSkipped(false);
    // Freeze the cycle number for this session so reflection storage stays
    // stable even if the mid-session completeStage rolls the cycle over.
    setSessionCycleNumber((progress.cyclesCompleted ?? 0) + 1);
    lastPromptRotateSecRef.current = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const startMini = () => {
    // 5-min mini variant of Stage 1 — same prompt pool, half duration,
    // doesn't advance the cycle counter. Ease-boost on-ramp. Instruction
    // is rewritten to say "5 minutes" (baseline text says "15 minutes")
    // so the timer + instruction stay consistent.
    const stage1 = STAGES[0];
    const miniInstruction = 'Partner A touches Partner B for 5 minutes, back, arms, face, scalp. Partner B only receives and notices. No goal. This is a mini version, no need to switch.';
    startStage({
      ...stage1,
      durationMinutes: 5,
      subtitle: '5-min mini · non-genital touch',
      instruction: miniInstruction,
    }, true);
  };

  const exitStage = () => {
    cancelCompletionNotif();
    setActiveStage(null);
    setIsMini(false);
    setRunStartMs(null);
    setAccumulatedMs(0);
    setReflectionText('');
    setReflectionSaved(false);
    setReflectionSkipped(false);
  };

  const handleMarkComplete = async () => {
    if (!coupleId || !activeStage) return;
    cancelCompletionNotif();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Mini sessions bump miniSessionsCompleted + lastActivityAt only —
    // no stage count, no currentCycleStages advance, no cycle overlay.
    if (isMini) {
      await completeMini(coupleId);
      trackEvent('sensate_mini_completed');
      setMarked(true);
      return;
    }
    const { cycleJustCompleted, cyclesCompleted } = await completeStage(coupleId, activeStage.id as 1 | 2 | 3 | 4, progress);
    trackEvent('sensate_stage_completed');
    setMarked(true);
    // If this completion filled the last missing stage in the cycle,
    // show the cycle-completion moment. Held in state and rendered as
    // an overlay so it feels like a distinct beat separate from the
    // stage's own "session saved" banner.
    if (cycleJustCompleted) {
      setTimeout(() => setCycleModalCount(cyclesCompleted), 400);
    }
  };

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (running) {
      // Pause: fold current run leg into accumulated, cancel scheduled notif.
      const legMs = Date.now() - (runStartMs ?? Date.now());
      setAccumulatedMs((a) => a + legMs);
      setRunStartMs(null);
      cancelCompletionNotif();
    } else {
      // Start / resume: schedule notification for remaining time, then set run start.
      const remainingSec = Math.max(totalSeconds - Math.floor(accumulatedMs / 1000), 0);
      if (activeStage && totalSeconds > 0 && remainingSec > 0) {
        scheduleCompletionNotif(activeStage, remainingSec);
      }
      setRunStartMs(Date.now());
    }
  };

  const nextPrompt = () => {
    Animated.sequence([
      Animated.timing(promptAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(promptAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    setPromptIndex((i) => (i + 1) % (shuffledPrompts.length || 1));
  };

  const done = totalSeconds > 0 && elapsed >= totalSeconds;

  // Don't render Sensate UI while paywall check resolves or during
  // redirect to /upgrade — otherwise a free user briefly sees the stage
  // picker flash before being sent away.
  if (subLoading || !isSubscribed) return null;
  // Wait for the first Firestore snapshot before allowing any startStage
  // taps — otherwise sessionCycleNumber captures stale cyclesCompleted=0
  // and reflection storage keys mismatch between partners. See B6.
  if (!progressLoaded && !activeStage) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.burgundy} size="large" />
      </View>
    );
  }

  if (!activeStage) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Presence</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.stageList}>
          <Text style={styles.intro}>
            A slow-touch practice for reconnection and presence. Four stages, each building on the last.
          </Text>
          {/* Cycles-completed pill. Shows once the couple has done at
              least one full 4-stage cycle. Small, non-competitive framing
              — it's a record of the journey, not a scoreboard. */}
          {(progress.cyclesCompleted ?? 0) > 0 && (
            <View style={styles.cyclesPill}>
              <Text style={styles.cyclesPillText}>
                🌸 {progress.cyclesCompleted} {progress.cyclesCompleted === 1 ? 'cycle' : 'cycles'} together
              </Text>
            </View>
          )}

          {STAGES.map((stage, idx) => {
            const key = `stage${stage.id}` as 'stage1' | 'stage2' | 'stage3' | 'stage4';
            const count = progress[key]?.count ?? 0;
            // Soft cadence hint: shown when the immediate predecessor stage
            // hasn't been done twice yet. Card stays tappable — this is a
            // gentle nudge, not a gate. Stage 1 never shows a hint.
            const priorStage = stage.id > 1 ? STAGES[idx - 1] : null;
            const priorKey = priorStage ? (`stage${priorStage.id}` as 'stage1' | 'stage2' | 'stage3' | 'stage4') : null;
            const priorCount = priorKey ? (progress[priorKey]?.count ?? 0) : 0;
            const showCadenceHint = priorStage !== null && priorCount < 2;
            const cadenceHint = showCadenceHint
              ? `Try Stage ${priorStage!.id} at least twice first, it works better that way.`
              : null;
            return (
              <View key={stage.id}>
                {/* Vertical connector between cards to signal progression.
                    Skipped before Stage 1 since there's nothing to chain from. */}
                {idx > 0 && (
                  <View style={styles.stageConnectorWrap}>
                    <View style={[styles.stageConnectorLine, { backgroundColor: stage.textColor, opacity: 0.3 }]} />
                    <Text style={[styles.stageConnectorArrow, { color: stage.textColor, opacity: 0.5 }]}>↓</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.stageCard, { backgroundColor: stage.color, borderColor: stage.color }]}
                  onPress={() => startStage(stage)}
                  activeOpacity={0.85}
                  accessibilityRole="button">
                  <View style={styles.stageTop}>
                    <View style={[styles.stageNumWrap, { borderColor: stage.textColor }]}>
                      <Text style={[styles.stageNum, { color: stage.textColor }]}>{stage.id}</Text>
                    </View>
                    <View style={styles.stageInfo}>
                      <Text style={[styles.stageTitle, { color: stage.textColor }]}>{stage.title}</Text>
                      <Text style={styles.stageSub}>{stage.subtitle}</Text>
                    </View>
                    <View style={styles.stageRight}>
                      {stage.durationMinutes > 0 && (
                        <Text style={[styles.stageDur, { color: stage.textColor }]}>{stage.durationMinutes} min</Text>
                      )}
                      {count > 0 && (
                        <View style={[styles.countBadge, { backgroundColor: stage.textColor }]}>
                          <Text style={styles.countBadgeText}>✓ {count}×</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {/* Per-stage "what this stage is doing" blurb — sits between
                      the header and the full instruction so the user knows
                      the arc goal in one glance. */}
                  <Text style={[styles.stageBlurb, { color: stage.textColor }]}>{stage.blurb}</Text>
                  <Text style={styles.stageInst}>{stage.instruction}</Text>
                  {cadenceHint && (
                    <Text style={styles.stageCadenceHint}>{`💡 ${cadenceHint}`}</Text>
                  )}
                  <View style={styles.stageActions}>
                    <Text style={[styles.stageStart, { color: stage.textColor }]}>Begin stage {stage.id} →</Text>
                    {/* Stage 1 gets an inline 5-min mini shortcut. Ease-boost
                        on-ramp folded into the same card instead of a floating
                        pill above, so the mini reads as "another way to enter
                        Stage 1" rather than a competing item. Doesn't advance
                        the cycle counter (completeMini stays separate from
                        completeStage). */}
                    {stage.id === 1 && (
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation?.(); startMini(); }}
                        style={styles.miniLink}
                        accessibilityRole="button"
                        accessibilityLabel="Start 5 minute mini session instead">
                        <Text style={[styles.miniLinkText, { color: stage.textColor }]}>
                          Or just 5 min tonight →
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: activeStage.color }]}>
      <View style={[styles.header, { borderBottomColor: 'rgba(0,0,0,0.08)', backgroundColor: 'transparent' }]}>
        <TouchableOpacity onPress={exitStage} style={styles.back} accessibilityRole="button">
          <Text style={[styles.backText, { color: activeStage.textColor }]}>‹ Stages</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeStage.textColor }]}>{activeStage.title}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.sessionContent}>
        <Text style={[styles.sessionSub, { color: activeStage.textColor, opacity: 0.7 }]}>{activeStage.subtitle}</Text>

        {/* Timer ring */}
        {activeStage.durationMinutes > 0 && (
          <View style={styles.timerSection}>
            <View style={[styles.timerOuterRing, { borderColor: activeStage.textColor, opacity: done ? 0.3 : 0.35 }]} />
            <LinearGradient
              colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.25)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.timerRing, { borderColor: activeStage.textColor, opacity: done ? 0.4 : 1 }]}
            >
              <Text style={[styles.timerOrnament, { color: activeStage.textColor }]}>✦</Text>
              {done ? (
                <Text style={[styles.timerDone, { color: activeStage.textColor }]}>✓ Done</Text>
              ) : (
                <>
                  <Text style={[styles.timerNum, { color: activeStage.textColor }]}>
                    {mins}:{secs.toString().padStart(2, '0')}
                  </Text>
                  <Text style={[styles.timerLabel, { color: activeStage.textColor }]}>remaining</Text>
                </>
              )}
            </LinearGradient>
            {!done && (
              <TouchableOpacity
                style={[styles.timerBtn, { backgroundColor: activeStage.textColor }]}
                onPress={toggleTimer}
                activeOpacity={0.85}
               accessibilityRole="button">
                <Text style={styles.timerBtnText}>{running ? 'Pause' : elapsed === 0 ? 'Start Timer' : 'Resume'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Prompt card */}
        <TouchableOpacity onPress={nextPrompt} activeOpacity={0.9} style={styles.promptWrap} accessibilityRole="button">
          <Animated.View style={[styles.promptCard, { opacity: promptAnim }]}>
            <Text style={[styles.promptText, { color: activeStage.textColor }]}>
              {shuffledPrompts[promptIndex] ?? activeStage.prompts[0]}
            </Text>
            <Text style={[styles.promptHint, { color: activeStage.textColor, opacity: 0.5 }]}>Tap for next prompt</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Instruction */}
        <View style={[styles.instructionCard, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
          <Text style={styles.instructionText}>{activeStage.instruction}</Text>
        </View>

        {/* Flow stage has no timer */}
        {activeStage.durationMinutes === 0 && (
          <Text style={[styles.flowNote, { color: activeStage.textColor, opacity: 0.7 }]}>
            No timer, this stage has no end. Stay as long as you want.
          </Text>
        )}

        {/* Mark complete */}
        {(done || activeStage.durationMinutes === 0) && (
          marked ? (
            <View style={[styles.markedBanner, { backgroundColor: activeStage.textColor }]}>
              <Text style={styles.markedText}>✓ Session saved</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.markBtn, { backgroundColor: activeStage.textColor }]}
              onPress={handleMarkComplete}
              activeOpacity={0.85}
             accessibilityRole="button">
              <Text style={styles.markBtnText}>✓ Mark session complete</Text>
            </TouchableOpacity>
          )
        )}

        {/* Post-session takeaway banner — stage-specific insight or
            invitation to talk, shown after Mark complete but before the
            reflection input. Sets the emotional register for the reflection
            that follows. Mini sessions skip this (they're a lightweight
            on-ramp, no debrief needed). */}
        {marked && !isMini && activeStage && (
          <View style={[styles.takeawayBanner, { borderLeftColor: activeStage.textColor }]}>
            <Text style={styles.takeawayText}>{activeStage.takeaway}</Text>
          </View>
        )}

        {/* Post-session mutual reflection. Only for full stages (mini skips
            this — it's a lightweight on-ramp). Shown once marked + not yet
            saved/skipped. On save, if the partner has already submitted for
            the same cycle+stage, both words reveal side-by-side. */}
        {marked && !isMini && activeStage && (() => {
          const uid = user?.uid ?? '';
          const p1 = couple?.partner1Uid ?? '';
          const p2 = couple?.partner2Uid ?? '';
          const stageIdKey = activeStage.id as 1 | 2 | 3 | 4;
          const { both, entries } = bothReflected(progress, sessionCycleNumber, stageIdKey, p1, p2);
          const mine = entries[uid];
          const theirs = entries[uid === p1 ? p2 : p1];
          const partnerName = (uid === p1 ? couple?.partner2Uid : couple?.partner1Uid) ? 'your partner' : 'your partner';

          if (both) {
            return (
              <View style={[styles.reflectionCard, { borderColor: activeStage.textColor }]}>
                <Text style={styles.reflectionRevealLabel}>How that felt</Text>
                <View style={styles.reflectionRevealRow}>
                  <View style={styles.reflectionRevealCol}>
                    <Text style={[styles.reflectionRevealWord, { color: activeStage.textColor }]}>{mine || '—'}</Text>
                    <Text style={styles.reflectionRevealWho}>You</Text>
                  </View>
                  <Text style={[styles.reflectionRevealDot, { color: activeStage.textColor }]}>·</Text>
                  <View style={styles.reflectionRevealCol}>
                    <Text style={[styles.reflectionRevealWord, { color: activeStage.textColor }]}>{theirs || '—'}</Text>
                    <Text style={styles.reflectionRevealWho}>{partnerName === 'your partner' ? 'Partner' : partnerName}</Text>
                  </View>
                </View>
              </View>
            );
          }

          if (reflectionSkipped || (mine && !theirs)) {
            return (
              <View style={[styles.reflectionCard, { borderColor: activeStage.textColor }]}>
                <Text style={styles.reflectionRevealWho}>
                  {mine ? 'Saved. Waiting for your partner to share their word.' : 'Skipped. You can always write one after your next session.'}
                </Text>
              </View>
            );
          }

          return (
            <View style={[styles.reflectionCard, { borderColor: activeStage.textColor }]}>
              <Text style={styles.reflectionPrompt}>What was that like for you?</Text>
              <TextInput
                style={styles.reflectionInput}
                value={reflectionText}
                onChangeText={setReflectionText}
                placeholder="One word or short phrase"
                placeholderTextColor={Colors.muted}
                maxLength={60}
                autoCapitalize="none"
                returnKeyType="done"
              />
              <View style={styles.reflectionActions}>
                <TouchableOpacity
                  onPress={() => { setReflectionSkipped(true); setReflectionText(''); }}
                  style={styles.reflectionSkipBtn}
                  accessibilityRole="button">
                  <Text style={styles.reflectionSkipText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!reflectionText.trim() || !coupleId}
                  style={[styles.reflectionSaveBtn, { backgroundColor: activeStage.textColor }, (!reflectionText.trim() || !coupleId) && { opacity: 0.4 }]}
                  onPress={async () => {
                    if (!coupleId || !reflectionText.trim()) return;
                    await submitReflection(coupleId, uid, sessionCycleNumber, stageIdKey, reflectionText.trim());
                    setReflectionSaved(true);
                    Haptics.selectionAsync();
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button">
                  <Text style={styles.reflectionSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </ScrollView>

      <HelpModal
        visible={help.visible}
        title="Presence"
        description="A slow-touch practice inspired by decades of sex therapy research (Masters & Johnson, 1970). Use it for reconnection after a busy stretch, if performance pressure has crept in, or before and after time apart."
        tips={[
          '4 stages, done in order over weeks (not one evening)',
          'Stage 1 Discover: non-genital touch, sensation only',
          'Stage 2 Connect: full body, turn-taking, no goal',
          'Stage 3 Together: mutual touch, no turn-taking',
          'Stage 4 Flow: open-ended, allow whatever comes',
          'Try each stage twice before moving on. Once a week works well.',
          "This isn't a game, it's practice. No goal, no performance.",
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />

      {/* Cycle completion moment — full-screen overlay fired when the
          couple's completeStage transaction filled the final missing
          stage in the current cycle. Deliberately quiet copy (this is
          Presence, not a game — no confetti, no leaderboard). Dismisses
          back to the stage list. */}
      {cycleModalCount !== null && (
        <View style={styles.cycleOverlay}>
          <View style={styles.cycleCard}>
            <Text style={styles.cycleEmoji}>🌸</Text>
            <Text style={styles.cycleTitle}>Cycle {cycleModalCount} complete</Text>
            <Text style={styles.cycleBody}>
              You've moved through all four stages together. What you learned about each other is yours to keep. The cycle resets whenever you'd like to walk it again.
            </Text>
            <TouchableOpacity
              style={styles.cycleBtn}
              onPress={() => { setCycleModalCount(null); setActiveStage(null); }}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.cycleBtnText}>Done for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },

  stageList: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg, paddingTop: Spacing.lg },
  intro: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, textAlign: 'center', lineHeight: 24 },

  stageCard: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1, ...Shadow.sm },
  stageTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stageNumWrap: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stageNum: { fontFamily: Fonts.heading, fontSize: 20, lineHeight: 24 },
  stageInfo: { flex: 1 },
  stageRight: { alignItems: 'flex-end', gap: 4 },
  stageTitle: { fontFamily: Fonts.heading, fontSize: 22 },
  stageSub: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  stageDur: { fontFamily: Fonts.bodyBold, fontSize: 14 },
  countBadge: { borderRadius: Radius.full, paddingVertical: 3, paddingHorizontal: 8 },
  countBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.white },
  stageInst: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 22 },
  stageStart: { fontFamily: Fonts.bodyBold, fontSize: 14 },

  sessionContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center', gap: Spacing.xl, paddingTop: Spacing.lg },
  sessionSub: { fontFamily: Fonts.bodyItalic, fontSize: 15, textAlign: 'center' },

  timerSection: { alignItems: 'center', gap: Spacing.lg, position: 'relative' },
  timerOuterRing: {
    position: 'absolute', top: -10, width: 200, height: 200, borderRadius: 100, borderWidth: 1,
  },
  timerRing: {
    width: 180, height: 180, borderRadius: 90, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  timerOrnament: { position: 'absolute', top: 18, fontSize: 12, opacity: 0.5 },
  timerNum: { fontFamily: Fonts.heading, fontSize: 50, lineHeight: 56 },
  timerLabel: { fontFamily: Fonts.bodyItalic, fontSize: 13, opacity: 0.7 },
  timerDone: { fontFamily: Fonts.headingItalic, fontSize: 32 },
  timerBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderRadius: Radius.full },
  timerBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.white },

  promptWrap: { width: '100%' },
  promptCard: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.md,
    minHeight: 140, justifyContent: 'center',
  },
  promptText: { fontFamily: Fonts.heading, fontSize: 22, textAlign: 'center', lineHeight: 30 },
  promptHint: { fontFamily: Fonts.bodyItalic, fontSize: 12 },

  instructionCard: { width: '100%', borderRadius: Radius.lg, padding: Spacing.md },
  instructionText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 22, textAlign: 'center' },

  flowNote: { fontFamily: Fonts.bodyItalic, fontSize: 14, textAlign: 'center' },

  markBtn: { width: '100%', paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  markBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },
  markedBanner: { width: '100%', paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  markedText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },

  // Cycles-completed pill on the stage list. Quiet framing —
  // acknowledges the journey without turning it into a scoreboard.
  cyclesPill: {
    alignSelf: 'center', backgroundColor: Colors.blush,
    paddingVertical: 6, paddingHorizontal: Spacing.md,
    borderRadius: Radius.full, marginTop: -Spacing.sm, marginBottom: Spacing.sm,
  },
  cyclesPillText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },

  // Cycle completion overlay. Full-screen backdrop tinted so the
  // moment reads as a distinct beat separate from the ongoing session
  // view underneath. Card is quiet on purpose — no confetti, no
  // "Congratulations!" energy. Sensate is a mindfulness feature, not
  // a game.
  cycleOverlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(61,26,36,0.72)',
    justifyContent: 'center', alignItems: 'center',
    padding: Spacing.lg, zIndex: 100,
  },
  cycleCard: {
    backgroundColor: Colors.cream, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.md,
    width: '100%', maxWidth: 400, ...Shadow.md,
  },
  cycleEmoji: { fontSize: 56 },
  cycleTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy, textAlign: 'center' },
  cycleBody: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 22 },
  cycleBtn: {
    marginTop: Spacing.sm, paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl, borderRadius: Radius.full,
    backgroundColor: Colors.burgundy,
  },
  cycleBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream },
  // Stage 1 gets an inline "or 5-min mini" link. Row keeps the primary
  // "Begin stage" CTA left-aligned with the mini shortcut right-aligned so
  // both actions sit at the same eye-line without one dominating.
  stageActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  miniLink: { paddingVertical: 4, paddingHorizontal: 8 },
  miniLinkText: { fontFamily: Fonts.bodyItalic, fontSize: 13, opacity: 0.75 },
  // Per-stage "what this stage is doing" blurb — italic, between the
  // number/title header and the fuller instruction. Frames the arc goal.
  stageBlurb: { fontFamily: Fonts.bodyItalic, fontSize: 14, marginTop: -4, marginBottom: 2, opacity: 0.85 },
  // Soft cadence hint on later stages when the predecessor hasn't been
  // done twice. Muted, italic, small — reads as guidance, not warning.
  stageCadenceHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: Spacing.xs },
  // Vertical connector between stage cards to visually chain them as a
  // 4-step sequence, not four independent options. Line + arrow.
  stageConnectorWrap: { alignItems: 'center', paddingVertical: 4 },
  stageConnectorLine: { width: 2, height: 12, borderRadius: 1 },
  stageConnectorArrow: { fontFamily: Fonts.bodyBold, fontSize: 14, marginTop: -2 },
  // Post-session takeaway banner — stage-specific insight before the
  // reflection card. Left-border accent color per stage.
  takeawayBanner: {
    marginTop: Spacing.md, padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderLeftWidth: 3,
    borderRadius: Radius.md,
  },
  takeawayText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.text, lineHeight: 20 },
  // Post-session reflection card — one-line optional input, becomes a
  // mutual-reveal card once both partners submit for the same cycle+stage.
  reflectionCard: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
    gap: Spacing.sm,
  },
  reflectionPrompt: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text, textAlign: 'center' },
  reflectionInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
    backgroundColor: '#fff',
  },
  reflectionActions: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  reflectionSkipBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
  reflectionSkipText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },
  reflectionSaveBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.full, alignItems: 'center' },
  reflectionSaveText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream },
  reflectionRevealLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' },
  reflectionRevealRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  reflectionRevealCol: { alignItems: 'center', minWidth: 90 },
  reflectionRevealWord: { fontFamily: Fonts.heading, fontSize: 22 },
  reflectionRevealWho: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 4, textAlign: 'center' },
  reflectionRevealDot: { fontFamily: Fonts.heading, fontSize: 28 },
});
