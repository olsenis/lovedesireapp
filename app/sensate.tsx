import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useSubscription } from '../hooks/useSubscription';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { SensateProgress, subscribeSensateProgress, completeStage } from '../services/sensateService';
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
}

const STAGES: Stage[] = [
  {
    id: 1,
    title: 'Discover',
    subtitle: 'Non-genital touch, sensation only',
    durationMinutes: 15,
    color: '#FAEEF2',
    textColor: '#A4366A',
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
    title: 'Flow',
    subtitle: 'Mindful, no agenda',
    durationMinutes: 0,
    color: '#F4A7B9',
    textColor: '#6a0a3e',
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
  const [progress, setProgress] = useState<SensateProgress>({
    stage1: { count: 0, lastDate: '' },
    stage2: { count: 0, lastDate: '' },
    stage3: { count: 0, lastDate: '' },
    cyclesCompleted: 0,
    currentCycleStages: { stage1: false, stage2: false, stage3: false },
  });
  // Cycle completion modal state — fires when a completeStage call fills
  // the final missing stage in the current cycle. Local-only state (no
  // need to sync across partners; each partner sees it locally when
  // their own action triggered the completion).
  const [cycleModalCount, setCycleModalCount] = useState<number | null>(null);
  const help = useHelp('sensate');
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
    return subscribeSensateProgress(coupleId, setProgress);
  }, [coupleId]);

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
      setPromptIndex((i) => (i + 1) % (activeStage?.prompts.length ?? 1));
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
          title: 'Sensate Focus 🌸',
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

  const startStage = (stage: Stage) => {
    // Cancel any leftover notification from a prior stage before switching.
    cancelCompletionNotif();
    setActiveStage(stage);
    setAccumulatedMs(0);
    setRunStartMs(null);
    setPromptIndex(0);
    setMarked(false);
    lastPromptRotateSecRef.current = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const exitStage = () => {
    cancelCompletionNotif();
    setActiveStage(null);
    setRunStartMs(null);
    setAccumulatedMs(0);
  };

  const handleMarkComplete = async () => {
    if (!coupleId || !activeStage) return;
    cancelCompletionNotif();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { cycleJustCompleted, cyclesCompleted } = await completeStage(coupleId, activeStage.id as 1 | 2 | 3, progress);
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
    setPromptIndex((i) => (i + 1) % (activeStage?.prompts.length ?? 1));
  };

  const done = totalSeconds > 0 && elapsed >= totalSeconds;

  // Don't render Sensate UI while paywall check resolves or during
  // redirect to /upgrade — otherwise a free user briefly sees the stage
  // picker flash before being sent away.
  if (subLoading || !isSubscribed) return null;

  if (!activeStage) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sensate Focus</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.stageList}>
          <Text style={styles.intro}>
            A research-backed approach to rekindling physical intimacy. Three stages, each building presence, not performance.
          </Text>
          {/* Cycles-completed pill. Shows once the couple has done at
              least one full 3-stage cycle. Small, non-competitive framing
              — it's a record of the journey, not a scoreboard. */}
          {(progress.cyclesCompleted ?? 0) > 0 && (
            <View style={styles.cyclesPill}>
              <Text style={styles.cyclesPillText}>
                🌸 {progress.cyclesCompleted} {progress.cyclesCompleted === 1 ? 'cycle' : 'cycles'} together
              </Text>
            </View>
          )}
          {STAGES.map((stage) => {
            const key = `stage${stage.id}` as 'stage1' | 'stage2' | 'stage3';
            const count = progress[key].count;
            return (
              <TouchableOpacity
                key={stage.id}
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
                <Text style={styles.stageInst}>{stage.instruction}</Text>
                <Text style={[styles.stageStart, { color: stage.textColor }]}>Begin stage {stage.id} →</Text>
              </TouchableOpacity>
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
              {activeStage.prompts[promptIndex]}
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
      </ScrollView>

      <HelpModal
        visible={help.visible}
        title="Sensate Focus"
        description="A research-backed approach from sex therapy (Masters & Johnson) for rekindling physical intimacy through mindful touch."
        tips={[
          '3 progressive stages, start with Stage 1',
          'Stage 1: non-sexual touch only, 15 min each',
          'Stage 2: full body, still no goal, 20 min each',
          'Stage 3: no timer, no goal, just presence and sensation',
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />

      {/* Cycle completion moment — full-screen overlay fired when the
          couple's completeStage transaction filled the final missing
          stage in the current cycle. Deliberately quiet copy (this is
          Sensate Focus, not a game — no confetti, no leaderboard).
          Dismisses back to the stage list. */}
      {cycleModalCount !== null && (
        <View style={styles.cycleOverlay}>
          <View style={styles.cycleCard}>
            <Text style={styles.cycleEmoji}>🌸</Text>
            <Text style={styles.cycleTitle}>Cycle {cycleModalCount} complete</Text>
            <Text style={styles.cycleBody}>
              You've moved through all three stages together. What you learned about each other is yours to keep. The cycle resets whenever you'd like to walk it again.
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
  stageStart: { fontFamily: Fonts.bodyBold, fontSize: 14, alignSelf: 'flex-end' },

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
});
