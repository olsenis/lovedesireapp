import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { loadVersusPool, VersusItem, VERSUS_UNLOCK_THRESHOLD, loadVersusStats, updateVersusStats, VersusStats } from '../services/versusService';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { trackEvent } from '../services/statsService';

type Status = 'loading' | 'empty' | 'playing' | 'done';

export default function VersusScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const help = useHelp('versus');
  useTrackScreen('versus');
  const [status, setStatus] = useState<Status>('loading');
  const [pool, setPool] = useState<VersusItem[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  // Streak tracking — resets on wrong answer, persists across cards otherwise.
  // longestThisGame captures peak within this session so final stats update
  // still gets credit for a hot streak even if user ends on a wrong one.
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestThisGame, setLongestThisGame] = useState(0);
  const [stats, setStats] = useState<VersusStats>({ bestScorePct: 0, bestStreak: 0, gamesPlayed: 0, lastPlayedAt: 0 });
  const [statsSaved, setStatsSaved] = useState(false);

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerUid = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'your partner';

  useEffect(() => {
    if (!coupleId) return;
    // Load persistent stats in parallel — non-blocking, defaults to zeros if
    // this is the couple's first game.
    loadVersusStats(coupleId).then(setStats).catch(() => {});
    // Unpaired user: skip pool fetch and show empty state instead of stuck
    // "Building your match..." spinner forever.
    if (!partnerUid) { setStatus('empty'); return; }
    loadVersusPool(coupleId, uid, partnerUid, 10)
      .then((items) => {
        setPool(items);
        setStatus(items.length === 0 ? 'empty' : 'playing');
      })
      .catch(() => setStatus('empty'));
  }, [coupleId, uid, partnerUid]);

  const current = pool[index];

  const pick = (option: string) => {
    if (revealed || !current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPicked(option);
    setRevealed(true);
    if (option === current.partnerAnswer) {
      setScore((s) => s + 1);
      setCurrentStreak((s) => {
        const next = s + 1;
        setLongestThisGame((l) => Math.max(l, next));
        return next;
      });
    } else {
      setCurrentStreak(0);
    }
  };

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (index + 1 >= pool.length) {
      setStatus('done');
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
      setRevealed(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setScore(0);
    setPicked(null);
    setRevealed(false);
    setCurrentStreak(0);
    setLongestThisGame(0);
    setStatsSaved(false);
    setStatus('loading');
    if (coupleId && partnerUid) {
      loadVersusPool(coupleId, uid, partnerUid, 10).then((items) => {
        setPool(items);
        setStatus(items.length === 0 ? 'empty' : 'playing');
      });
    }
  };

  const pct = pool.length > 0 ? Math.round((score / pool.length) * 100) : 0;

  // Persist stats once when game ends. statsSaved guard prevents double-write
  // if user taps "Play again" and comes back — restart resets the guard.
  useEffect(() => {
    if (status !== 'done' || statsSaved || !coupleId) return;
    updateVersusStats(coupleId, pct, longestThisGame)
      .then(() => loadVersusStats(coupleId).then(setStats))
      .catch(() => {})
      .finally(() => setStatsSaved(true));
    trackEvent('versus_played');
  }, [status, statsSaved, coupleId, pct, longestThisGame]);

  // "Talk about it" prompts — rotates through a few phrasings so the prompt
  // doesn't feel formulaic across a 10-round game. The suggestion frames the
  // reveal as a conversation opener rather than a scored quiz answer.
  const talkPrompts = [
    `Ask ${partnerName} why`,
    `Ask ${partnerName} what led to that`,
    'Talk about it later',
    `See if ${partnerName} still feels that way`,
    'One to bring up over dinner',
  ];
  const talkPrompt = current ? talkPrompts[index % talkPrompts.length] : talkPrompts[0];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Versus</Text>
        {status === 'playing' ? (
          <View style={styles.counterCol}>
            <Text style={styles.counter}>{index + 1}/{pool.length}</Text>
            {currentStreak >= 2 && (
              <Text style={styles.streakBadge}>🔥 {currentStreak}</Text>
            )}
          </View>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {status === 'loading' && (
        <View style={styles.center}>
          <Text style={styles.loading}>Building your match...</Text>
        </View>
      )}

      {status === 'empty' && (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🤔</Text>
          <Text style={styles.emptyTitle}>Not enough answers yet</Text>
          <Text style={styles.emptyBody}>
            Versus works by quizzing you on {partnerName}&apos;s picks from Daily. It needs at least {VERSUS_UNLOCK_THRESHOLD} of their binary answers, the kind with two options like &ldquo;A or B?&rdquo;, before it can build your first round.
          </Text>
          <Text style={styles.emptyBody}>
            Play Daily together for a few days. Every binary question either of you answers becomes ammunition for Versus.
          </Text>
          {stats.gamesPlayed > 0 && (
            <View style={styles.emptyStatsRow}>
              <Text style={styles.emptyStatsText}>
                Your best so far: <Text style={styles.emptyStatsVal}>{stats.bestScorePct}%</Text>
                {stats.bestStreak >= 2 && <>  ·  🔥 {stats.bestStreak}</>}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.cta} onPress={() => router.replace('/daily?category=playful' as any)} accessibilityRole="button">
            <Text style={styles.ctaText}>Open Daily →</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'playing' && current && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>What did {partnerName} pick?</Text>
          <Text style={styles.question}>{current.question.text}</Text>

          <View style={styles.optionsWrap}>
            {current.options.map((opt) => {
              const isPicked = picked === opt;
              const isRight = revealed && opt === current.partnerAnswer;
              const isWrong = revealed && isPicked && opt !== current.partnerAnswer;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionBtn,
                    isRight && styles.optionRight,
                    isWrong && styles.optionWrong,
                    revealed && !isPicked && !isRight && { opacity: 0.5 },
                  ]}
                  onPress={() => pick(opt)}
                  disabled={revealed}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={styles.optionText}>{opt}</Text>
                  {isRight && <Text style={styles.optionBadge}>✓</Text>}
                  {isWrong && <Text style={styles.optionBadge}>✗</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {revealed && (
            <>
              <Text style={styles.reveal}>
                {picked === current.partnerAnswer
                  ? `Yes, ${partnerName} picked "${current.partnerAnswer}"`
                  : `${partnerName} actually picked "${current.partnerAnswer}"`}
              </Text>
              {/* Conversation hook — the whole point of Versus isn't the
                  score, it's the "wait, why THAT one?" moment. Prompt turns
                  every reveal into a talking point rather than a data point. */}
              <View style={styles.talkPromptWrap}>
                <Text style={styles.talkPromptIcon}>💬</Text>
                <Text style={styles.talkPromptText}>{talkPrompt}</Text>
              </View>
              <TouchableOpacity style={styles.nextBtn} onPress={next} accessibilityRole="button">
                <Text style={styles.nextBtnText}>{index + 1 >= pool.length ? 'See result →' : 'Next →'}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {status === 'done' && (
        <ScrollView contentContainerStyle={styles.content}>
          <LinearGradient colors={['#FFE5EC', Colors.blush, '#F4A7B9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.resultCard}>
            <Text style={styles.resultEyebrow}>Your score</Text>
            <Text style={styles.resultNum}>{score} / {pool.length}</Text>
            <Text style={styles.resultPct}>{pct}%</Text>
            <View style={styles.resultDivider} />
            <Text style={styles.resultMsg}>
              {pct >= 80 ? `You know ${partnerName} inside and out 💖` :
               pct >= 50 ? `Pretty good, but still surprises to find 🌸` :
               `Time to dig deeper, ask ${partnerName} more questions 🌱`}
            </Text>
          </LinearGradient>

          {/* Records row — celebrates any new best set this game.
              Silent if the new score/streak didn't beat prior records. */}
          {statsSaved && (pct >= stats.bestScorePct || longestThisGame >= stats.bestStreak) && (
            <View style={styles.newRecordCard}>
              <Text style={styles.newRecordEyebrow}>✨ New record ✨</Text>
              {pct >= stats.bestScorePct && (
                <Text style={styles.newRecordText}>Best score: <Text style={styles.newRecordVal}>{pct}%</Text></Text>
              )}
              {longestThisGame >= stats.bestStreak && longestThisGame >= 2 && (
                <Text style={styles.newRecordText}>Longest streak: <Text style={styles.newRecordVal}>🔥 {longestThisGame}</Text></Text>
              )}
            </View>
          )}

          {/* Persistent stats block — always shown so users see the game as
              a returning ritual, not a one-off. */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statNum}>{Math.max(stats.bestScorePct, statsSaved ? pct : 0)}%</Text>
              <Text style={styles.statLabel}>Best score</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statNum}>🔥 {Math.max(stats.bestStreak, statsSaved ? longestThisGame : 0)}</Text>
              <Text style={styles.statLabel}>Longest streak</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statNum}>{stats.gamesPlayed + (statsSaved ? 0 : 0)}</Text>
              <Text style={styles.statLabel}>Games played</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.cta} onPress={restart} accessibilityRole="button">
            <Text style={styles.ctaText}>Play again ↻</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <HelpModal
        visible={help.visible}
        title="Versus"
        description={`Test how well you know ${partnerName}. We pull their quick-fire answers from Questions Game and ask you to guess each one.`}
        tips={[
          "Only works with binary (A or B) questions you've both answered before",
          `Pick what you think ${partnerName} chose`,
          "You see the right answer immediately, no penalty for wrong",
          "Track your knowing-them percentage over time",
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
  counter: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted, textAlign: 'right' },
  counterCol: { width: 60, alignItems: 'flex-end', gap: 2 },
  streakBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#FF6B35' },

  center: { flex: 1, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loading: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy, textAlign: 'center' },
  emptyBody: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  emptyStatsRow: { marginTop: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, backgroundColor: Colors.blush, borderRadius: Radius.full },
  emptyStatsText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.burgundy },
  emptyStatsVal: { fontFamily: Fonts.bodyBold, color: Colors.burgundy },

  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  eyebrow: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' },
  question: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy, textAlign: 'center', lineHeight: 36 },

  optionsWrap: { gap: Spacing.sm, marginTop: Spacing.md },
  optionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md, borderWidth: 2, borderColor: Colors.border, gap: Spacing.sm, ...Shadow.sm },
  optionRight: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  optionWrong: { borderColor: '#E57373', backgroundColor: '#FFEBEE' },
  optionText: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Colors.text },
  optionBadge: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },

  reveal: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 22 },
  talkPromptWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.blush, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.rose,
  },
  talkPromptIcon: { fontSize: 20 },
  talkPromptText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
  nextBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  nextBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },

  resultCard: { padding: Spacing.xl, borderRadius: Radius.xl, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.rose, ...Shadow.md },
  resultEyebrow: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.5 },
  resultNum: { fontFamily: Fonts.heading, fontSize: 48, color: Colors.burgundy },
  resultPct: { fontFamily: Fonts.headingItalic, fontSize: 28, color: Colors.burgundy },
  resultDivider: { width: 40, height: 1, backgroundColor: Colors.burgundy, opacity: 0.2, marginVertical: 6 },
  resultMsg: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 24 },

  newRecordCard: {
    backgroundColor: '#FFF4E8', padding: Spacing.md, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: '#F4A7B9', alignItems: 'center', gap: 4,
  },
  newRecordEyebrow: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, letterSpacing: 1 },
  newRecordText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text },
  newRecordVal: { fontFamily: Fonts.bodyBold, color: Colors.burgundy },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  statBlock: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  statNum: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy },
  statLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, textAlign: 'center', letterSpacing: 0.3 },

  cta: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.md },
  ctaText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
