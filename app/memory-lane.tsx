import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { WhileYouWait } from '../components/WhileYouWait';
import { getCurrentWeekId } from '../services/stateUnionService';
import { memoryLaneDaysLeft, memoryLaneEligible } from '../services/featureUnlockService';
import {
  MemoryLaneDoc, MemorySource,
  subscribeMemoryLane, ensureMemoryLaneWeek, answerMemoryQuestion, completeMemoryLane, memoryLaneScore,
} from '../services/memoryLaneService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const SOURCE_LABEL: Record<MemorySource, string> = {
  moment: 'From your Moments',
  daily: 'From Daily',
  mood: 'From mood check-ins',
  milestone: 'From Our Story',
  sunday: 'From Sunday Check-in',
  fw: 'From Fantasy Wishes',
};

export default function MemoryLaneScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const uid = user?.uid ?? '';
  const coupleId = profile?.coupleId;
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'your partner';
  const weekId = useMemo(() => getCurrentWeekId(), []);
  useTrackScreen('memory_lane');

  const eligible = memoryLaneEligible(couple?.createdAt);
  const daysLeft = memoryLaneDaysLeft(couple?.createdAt);

  const [docState, setDocState] = useState<MemoryLaneDoc | null | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  // The question whose ✓/✗ banner is showing. Cleared by Next.
  const [revealed, setRevealed] = useState<{ qi: number; chosen: number } | null>(null);
  const ensuredRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeMemoryLane(coupleId, weekId, setDocState);
  }, [coupleId, weekId]);

  // Generate this week's quiz if nobody has yet. Runs once per mount, only
  // after the first snapshot says the doc is missing.
  useEffect(() => {
    if (!coupleId || !partnerId || !eligible || docState !== null || ensuredRef.current) return;
    ensuredRef.current = true;
    setGenerating(true);
    ensureMemoryLaneWeek(coupleId, weekId, uid, partnerId, partnerName)
      .catch(() => {})
      .finally(() => setGenerating(false));
  }, [coupleId, partnerId, eligible, docState, weekId, uid, partnerName]);

  const score = memoryLaneScore(docState ?? null, uid);
  const questions = docState?.questions ?? [];
  const myAnswers = docState?.answers?.[uid] ?? {};
  const firstUnanswered = questions.findIndex((_, i) => typeof myAnswers[String(i)] !== 'number');
  const allAnswered = questions.length > 0 && firstUnanswered === -1;
  const iCompleted = !!docState?.completedAt?.[uid];
  const partnerCompleted = !!partnerId && !!docState?.completedAt?.[partnerId];
  const partnerScore = partnerId ? memoryLaneScore(docState ?? null, partnerId) : null;

  // Mark complete exactly once when the last answer lands.
  useEffect(() => {
    if (!coupleId || !allAnswered || iCompleted || completedRef.current) return;
    completedRef.current = true;
    completeMemoryLane(coupleId, weekId, uid).catch(() => {});
  }, [coupleId, allAnswered, iCompleted, weekId, uid]);

  const displayIndex = revealed ? revealed.qi : firstUnanswered;
  const current = displayIndex >= 0 ? questions[displayIndex] : null;

  const handlePick = async (optionIndex: number) => {
    if (!coupleId || !current || revealed) return;
    const qi = displayIndex;
    const correct = optionIndex === current.correctIndex;
    setRevealed({ qi, chosen: optionIndex });
    Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    await answerMemoryQuestion(coupleId, weekId, uid, qi, optionIndex, correct).catch(() => {});
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Memory Lane</Text>
      <View style={{ width: 60 }} />
    </View>
  );

  // ── Gate: reachable via deep link before 30 days ──
  if (couple && !eligible) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={[styles.card, styles.center]}>
          <Text style={styles.bigEmoji}>🧠</Text>
          <Text style={styles.cardTitle}>Not quite yet</Text>
          <Text style={styles.cardText}>
            Memory Lane quizzes you on your own story, so it needs some first. It unlocks after {daysLeft === 1 ? 'one more day' : `${daysLeft} more days`} together.
          </Text>
        </View>
      </View>
    );
  }

  if (docState === undefined || (docState === null && generating) || !couple) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={Colors.burgundy} size="large" />
        {generating && <Text style={styles.cardText}>Digging through your story…</Text>}
      </View>
    );
  }

  // ── Thin history ──
  if (!docState || questions.length === 0) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={[styles.card, styles.center]}>
          <Text style={styles.bigEmoji}>🌱</Text>
          <Text style={styles.cardTitle}>Not enough history yet</Text>
          <Text style={styles.cardText}>
            Keep taking Moments, answering Daily and checking in on Sundays. Check back next week.
          </Text>
        </View>
      </View>
    );
  }

  // ── Done ──
  if (allAnswered && !revealed) {
    return (
      <View style={styles.screen}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>Week {weekId.split('-')[1]} · {weekId.split('-')[0]}</Text>
          <View style={[styles.card, styles.center]}>
            <Text style={styles.bigEmoji}>{score.correct === score.total ? '🏆' : score.correct >= Math.ceil(score.total / 2) ? '🎯' : '🌱'}</Text>
            <Text style={styles.scoreText}>You got {score.correct} of {score.total}</Text>
            {partnerCompleted && partnerScore ? (
              <Text style={styles.cardText}>{partnerName} got {partnerScore.correct} of {partnerScore.total}</Text>
            ) : (
              <Text style={styles.cardText}>{partnerName} has not played this week yet</Text>
            )}
            <Text style={styles.hint}>A new set arrives every week from your own story.</Text>
          </View>
          {!partnerCompleted && <WhileYouWait />}
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.secondaryBtnText}>Back to Discover</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Playing ──
  const q = current!;
  const isLast = displayIndex === questions.length - 1;
  const correctNow = revealed ? revealed.chosen === q.correctIndex : false;

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.progressRow}>
          {questions.map((_, i) => (
            <View key={i} style={[styles.dot, i < displayIndex && styles.dotDone, i === displayIndex && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.eyebrow}>{displayIndex + 1} of {questions.length} · {SOURCE_LABEL[q.source]}</Text>

        <View style={styles.card}>
          {q.imageURL && (
            <Image source={{ uri: q.imageURL }} style={styles.photo} contentFit="cover" transition={200} />
          )}
          <Text style={styles.prompt}>{q.prompt}</Text>

          <View style={styles.options}>
            {q.options.map((opt, i) => {
              const picked = revealed?.chosen === i;
              const isCorrect = revealed && i === q.correctIndex;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.option,
                    isCorrect && styles.optionCorrect,
                    picked && !isCorrect && styles.optionWrong,
                  ]}
                  onPress={() => handlePick(i)}
                  disabled={!!revealed}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={[styles.optionText, (isCorrect || (picked && !isCorrect)) && styles.optionTextOn]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {revealed && (
            <View style={[styles.banner, correctNow ? styles.bannerCorrect : styles.bannerWrong]}>
              <Text style={styles.bannerText}>{correctNow ? '🎯 You remembered' : '🌱 Time flies'}</Text>
              {!correctNow && <Text style={styles.bannerSub}>The answer: {q.options[q.correctIndex]}</Text>}
            </View>
          )}

          {revealed && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => { setRevealed(null); Haptics.selectionAsync(); }}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{isLast ? 'See your score' : 'Next →'}</Text>
            </TouchableOpacity>
          )}
        </View>
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
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  eyebrow: {
    fontFamily: Fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase',
    color: Colors.muted, textAlign: 'center',
  },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.blush },
  dotDone: { backgroundColor: Colors.rose },
  dotActive: { backgroundColor: Colors.burgundy },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md, margin: Spacing.lg, ...Shadow.sm,
  },
  photo: { width: '100%', aspectRatio: 1, borderRadius: Radius.lg, backgroundColor: Colors.blush },
  prompt: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy, textAlign: 'center', lineHeight: 30 },
  options: { gap: Spacing.sm },
  option: {
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: Radius.lg,
    backgroundColor: Colors.blush, borderWidth: 1, borderColor: Colors.border,
  },
  optionCorrect: { backgroundColor: '#DCEDC8', borderColor: '#AED581' },
  optionWrong: { backgroundColor: '#F8BBD0', borderColor: '#F48FB1' },
  optionText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy, textAlign: 'center' },
  optionTextOn: { color: Colors.text },
  banner: { padding: Spacing.md, borderRadius: Radius.md },
  bannerCorrect: { backgroundColor: '#DCEDC8', borderWidth: 1, borderColor: '#AED581' },
  bannerWrong: { backgroundColor: '#F8BBD0', borderWidth: 1, borderColor: '#F48FB1' },
  bannerText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy, textAlign: 'center' },
  bannerSub: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center', marginTop: 2 },
  primaryBtn: { backgroundColor: Colors.burgundy, paddingVertical: 14, borderRadius: Radius.full, alignItems: 'center' },
  primaryBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  secondaryBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  secondaryBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
  bigEmoji: { fontSize: 44 },
  cardTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy, textAlign: 'center' },
  cardText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 22 },
  scoreText: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.burgundy, textAlign: 'center' },
  hint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },
});
