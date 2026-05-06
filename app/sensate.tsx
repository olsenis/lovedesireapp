import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

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
    color: '#E8F5E9',
    textColor: '#2E7D32',
    instruction: 'Partner A touches Partner B for 15 minutes, back, arms, face, scalp. Partner B only receives and notices. No goal. No performance. Switch when the timer ends.',
    prompts: [
      'Notice the temperature of their skin.',
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
      'Pay attention to their responses without chasing them.',
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
    color: '#F3E5F5',
    textColor: '#6A1B9A',
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
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [running, setRunning] = useState(false);
  const help = useHelp('sensate');
  const [elapsed, setElapsed] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const promptAnim = useRef(new Animated.Value(1)).current;

  const totalSeconds = (activeStage?.durationMinutes ?? 0) * 60;
  const remaining = Math.max(totalSeconds - elapsed, 0);
  const progress = totalSeconds > 0 ? Math.min(elapsed / totalSeconds, 1) : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (totalSeconds > 0 && e >= totalSeconds) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return e;
        }
        // Rotate prompt every 90 seconds
        if ((e + 1) % 90 === 0) {
          Animated.sequence([
            Animated.timing(promptAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(promptAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]).start();
          setPromptIndex((i) => (i + 1) % (activeStage?.prompts.length ?? 1));
        }
        return e + 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, totalSeconds]);

  const startStage = (stage: Stage) => {
    setActiveStage(stage);
    setElapsed(0);
    setPromptIndex(0);
    setRunning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRunning((r) => !r);
  };

  const nextPrompt = () => {
    Animated.sequence([
      Animated.timing(promptAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(promptAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    setPromptIndex((i) => (i + 1) % (activeStage?.prompts.length ?? 1));
  };

  const done = totalSeconds > 0 && elapsed >= totalSeconds;

  if (!activeStage) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sensate Focus</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.stageList}>
          <Text style={styles.intro}>
            A research-backed approach to rekindling physical intimacy. Three stages, each building presence, not performance.
          </Text>
          {STAGES.map((stage) => (
            <TouchableOpacity
              key={stage.id}
              style={[styles.stageCard, { backgroundColor: stage.color, borderColor: stage.color }]}
              onPress={() => startStage(stage)}
              activeOpacity={0.85}
            >
              <View style={styles.stageTop}>
                <View style={[styles.stageNumWrap, { borderColor: stage.textColor }]}>
                  <Text style={[styles.stageNum, { color: stage.textColor }]}>{stage.id}</Text>
                </View>
                <View style={styles.stageInfo}>
                  <Text style={[styles.stageTitle, { color: stage.textColor }]}>{stage.title}</Text>
                  <Text style={styles.stageSub}>{stage.subtitle}</Text>
                </View>
                {stage.durationMinutes > 0 && (
                  <Text style={[styles.stageDur, { color: stage.textColor }]}>{stage.durationMinutes} min</Text>
                )}
              </View>
              <Text style={styles.stageInst}>{stage.instruction}</Text>
              <Text style={[styles.stageStart, { color: stage.textColor }]}>Begin stage {stage.id} →</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: activeStage.color }]}>
      <View style={[styles.header, { borderBottomColor: 'rgba(0,0,0,0.08)', backgroundColor: 'transparent' }]}>
        <TouchableOpacity onPress={() => setActiveStage(null)} style={styles.back}>
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
            <View style={[styles.timerRing, { borderColor: activeStage.textColor, opacity: done ? 0.4 : 1 }]}>
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
            </View>
            {!done && (
              <TouchableOpacity
                style={[styles.timerBtn, { backgroundColor: activeStage.textColor }]}
                onPress={toggleTimer}
                activeOpacity={0.85}
              >
                <Text style={styles.timerBtnText}>{running ? 'Pause' : elapsed === 0 ? 'Start Timer' : 'Resume'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Prompt card */}
        <TouchableOpacity onPress={nextPrompt} activeOpacity={0.9} style={styles.promptWrap}>
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
  stageTitle: { fontFamily: Fonts.heading, fontSize: 22 },
  stageSub: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  stageDur: { fontFamily: Fonts.bodyBold, fontSize: 14 },
  stageInst: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 22 },
  stageStart: { fontFamily: Fonts.bodyBold, fontSize: 14, alignSelf: 'flex-end' },

  sessionContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center', gap: Spacing.xl, paddingTop: Spacing.lg },
  sessionSub: { fontFamily: Fonts.bodyItalic, fontSize: 15, textAlign: 'center' },

  timerSection: { alignItems: 'center', gap: Spacing.lg },
  timerRing: {
    width: 180, height: 180, borderRadius: 90, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  timerNum: { fontFamily: Fonts.heading, fontSize: 46, lineHeight: 52 },
  timerLabel: { fontFamily: Fonts.bodyItalic, fontSize: 13 },
  timerDone: { fontFamily: Fonts.heading, fontSize: 28 },
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
});
