import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { DARES, DareLevel, DARE_LEVEL_CONFIG } from '../constants/content';
import {
  TwoTruthsSession, subscribeTwoTruths, startTwoTruths,
  submitStatements, submitGuess, nextRound, resetTwoTruths,
} from '../services/twoTruthsService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const LEVELS: DareLevel[] = ['sweet', 'flirty', 'spicy'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickUnique<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const STATEMENT_POOL: string[] = [
  // Experiences
  "Has been to more than 10 countries",
  "Has never broken a bone",
  "Has a tattoo",
  "Has met a celebrity in person",
  "Has been on TV or radio",
  "Has gone skydiving or bungee jumping",
  "Has skinny dipped",
  "Has crashed a party",
  "Has won a competition or award",
  "Has been in a car accident",
  "Has slept outside under the stars",
  "Has ridden a horse",
  "Has been to a music festival",
  "Has eaten something really unusual",
  "Has pulled an all-nighter for fun, not work",
  "Has been on a blind date",
  "Has lived in another country",
  "Has been in a fist fight",
  "Has seen the Northern Lights",
  "Has gone camping alone",
  // Skills & abilities
  "Can play a musical instrument",
  "Can speak more than 2 languages",
  "Can cook a full dinner from scratch",
  "Can do a cartwheel",
  "Can juggle",
  "Can solve a Rubik's cube",
  "Can drive a manual car",
  "Can swim more than 1km without stopping",
  "Can do a handstand",
  "Can whistle with fingers",
  // Personality & preferences
  "Is afraid of heights",
  "Prefers mornings to evenings",
  "Has cried at a movie in the last year",
  "Believes in ghosts",
  "Has an irrational fear of something specific",
  "Sleeps with a fan on every night",
  "Talks to plants or pets like people",
  "Has a recurring dream",
  "Keeps a journal or diary",
  "Always makes their bed in the morning",
  // Past & history
  "Has had a nickname that stuck for years",
  "Skipped school or work just to stay home",
  "Has been fired from a job",
  "Was voted something in school (best dressed, funniest, etc.)",
  "Had an imaginary friend as a child",
  "Was in a band or music group",
  "Has written a poem for someone",
  "Had a pen pal",
  "Once got lost in a city alone",
  "Has done karaoke in public",
  // Fun / random
  "Can name all the countries in Europe",
  "Has eaten at a Michelin-star restaurant",
  "Has read more than 50 books in a year",
  "Has gone a full week without their phone",
  "Owns more than 20 plants",
  "Has been vegetarian or vegan at some point",
  "Has run a half marathon or longer",
  "Has done stand-up comedy",
  "Has been to a silent disco",
  "Has tried meditating regularly",
  "Has sold something they made",
  "Once had a job they never told anyone about",
  "Can name every winner of a major competition from the last decade",
  "Has donated blood more than once",
  "Has a collection of something unusual",
];

export default function TwoTruthsScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [session, setSession] = useState<TwoTruthsSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState<string[]>([]);
  const [lie, setLie] = useState<number | null>(null);

  const generateStatements = useCallback(() => {
    setGenerated(pickUnique(STATEMENT_POOL, 3));
    setLie(null);
  }, []);
  const help = useHelp('two-truths');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'Partner';
  const myName = profile?.name ?? 'You';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeTwoTruths(coupleId, (s) => {
      setSession(s);
      setLoading(false);
    });
  }, [coupleId]);

  // Auto-generate statements when writing phase starts for the writer
  useEffect(() => {
    if (session?.phase === 'writing' && session.writerUid === uid && generated.length === 0) {
      generateStatements();
    }
    if (session?.phase !== 'writing') {
      setGenerated([]);
      setLie(null);
    }
  }, [session?.phase, session?.writerUid, uid]);

  const isWriter = session?.writerUid === uid;
  const cfg = DARE_LEVEL_CONFIG[session?.dareLevel ?? 'flirty'];

  const handleStart = async (level: DareLevel) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startTwoTruths(coupleId, uid, level);
  };

  const handleSubmitStatements = async () => {
    if (!coupleId || generated.length < 3 || lie === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await submitStatements(coupleId, generated, lie);
  };

  const handleGuess = async (index: number) => {
    if (!coupleId || !session) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const dares = DARES.filter(d => d.level === session.dareLevel);
    const dare = pickRandom(dares).text;
    await submitGuess(coupleId, index, dare);
  };

  const handleNext = async () => {
    if (!coupleId || !session || !partnerId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await nextRound(coupleId, session, uid, partnerId);
  };

  const handleReset = async () => {
    if (!coupleId) return;
    setGenerated([]);
    setLie(null);
    await resetTwoTruths(coupleId);
  };

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (!loading && (!session || session.round === 0)) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Two Truths One Lie</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.picker}>
          <Text style={styles.pickerIntro}>
            The app gives you 3 statements. Pick the one that is NOT true about you.{'\n'}
            Your partner guesses which is the lie. Wrong guess = dare.
          </Text>
          <Text style={styles.pickerLabel}>Choose dare level</Text>
          {LEVELS.map(level => {
            const c = DARE_LEVEL_CONFIG[level];
            return (
              <TouchableOpacity
                key={level}
                style={[styles.levelCard, { backgroundColor: c.color }]}
                onPress={() => handleStart(level)}
                activeOpacity={0.85}
               accessibilityRole="button">
                <Text style={styles.levelEmoji}>{c.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelLabel, { color: c.textColor }]}>{c.label}</Text>
                  <Text style={styles.levelSub}>You go first, {partnerName} guesses</Text>
                </View>
                <Text style={[styles.levelArrow, { color: c.textColor }]}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  if (!session) return null;

  const myScore = session.scores[uid] ?? 0;
  const partnerScore = session.scores[partnerId ?? ''] ?? 0;
  const correct = session.guessIndex === session.lieIndex;
  const guessUid = session.writerUid === uid ? partnerId : uid;
  const scoredName = correct ? (isWriter ? myName : partnerName) : (isWriter ? partnerName : myName);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Two Truths One Lie</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn} accessibilityRole="button">
          <Text style={styles.resetBtnText}>↺ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Round + score */}
        <View style={styles.roundRow}>
          <Text style={styles.roundText}>Round {session.round}</Text>
          <Text style={styles.scoreText}>{myName} {myScore} — {partnerName} {partnerScore}</Text>
        </View>

        {/* Turn badge */}
        <View style={[styles.turnBadge, { backgroundColor: cfg.color }]}>
          <Text style={[styles.turnText, { color: cfg.textColor }]}>
            {session.phase === 'writing'
              ? isWriter ? 'Your turn to write' : `Waiting for ${partnerName} to write...`
              : session.phase === 'guessing'
              ? !isWriter ? 'Your turn to guess' : `Waiting for ${partnerName} to guess...`
              : 'Result'}
          </Text>
        </View>

        {/* ── WRITING PHASE ── */}
        {session.phase === 'writing' && isWriter && (
          <>
            <Text style={styles.hint}>
              Tap the statement that is NOT true about you. That becomes the lie.
            </Text>
            {generated.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.statementCard, lie === i && styles.statementCardLie]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLie(lie === i ? null : i); }}
                activeOpacity={0.85}
               accessibilityRole="button">
                <View style={styles.statementCardLeft}>
                  <Text style={[styles.statementCardText, lie === i && styles.statementCardTextLie]}>{s}</Text>
                </View>
                <View style={[styles.statementCardBadge, lie === i && styles.statementCardBadgeLie]}>
                  <Text style={[styles.statementCardBadgeText, lie === i && styles.statementCardBadgeTextLie]}>
                    {lie === i ? '🤥 LIE' : 'True'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={generateStatements}
              activeOpacity={0.8}
             accessibilityRole="button">
              <Text style={styles.refreshBtnText}>↻ Get different statements</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, lie === null && { opacity: 0.4 }]}
              onPress={handleSubmitStatements}
              disabled={lie === null}
              activeOpacity={0.85}
             accessibilityRole="button">
              <Text style={styles.actionBtnText}>Send to {partnerName} →</Text>
            </TouchableOpacity>
          </>
        )}

        {session.phase === 'writing' && !isWriter && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>✏️</Text>
            <Text style={styles.waitingText}>{partnerName} is writing their statements...</Text>
            <Text style={styles.waitingHint}>Get ready to spot the lie</Text>
          </View>
        )}

        {/* ── GUESSING PHASE ── */}
        {session.phase === 'guessing' && !isWriter && (
          <>
            <Text style={styles.hint}>Which one is the lie? Tap to guess.</Text>
            {session.statements.map((s, i) => (
              <TouchableOpacity key={i} style={styles.guessCard} onPress={() => handleGuess(i)} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.guessNum}>{i + 1}</Text>
                <Text style={styles.guessText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {session.phase === 'guessing' && isWriter && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>🤔</Text>
            <Text style={styles.waitingText}>{partnerName} is guessing the lie...</Text>
            <Text style={styles.waitingHint}>Will they figure it out?</Text>
          </View>
        )}

        {/* ── RESULT PHASE ── */}
        {session.phase === 'result' && (
          <>
            <View style={[styles.resultCard, { backgroundColor: correct ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={styles.resultEmoji}>{correct ? '🎯' : '😅'}</Text>
              <Text style={styles.resultTitle}>
                {correct
                  ? `${!isWriter ? 'You' : partnerName} guessed correctly!`
                  : `Wrong! The lie was statement ${(session.lieIndex ?? 0) + 1}`}
              </Text>
              <Text style={styles.resultSub}>{scoredName} does the dare:</Text>
            </View>

            <View style={[styles.dareCard, { backgroundColor: cfg.color }]}>
              <Text style={[styles.dareBadge, { color: cfg.textColor }]}>{cfg.emoji} {cfg.label} Dare</Text>
              <Text style={styles.dareText}>{session.dare}</Text>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handleNext} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.actionBtnText}>
                Next — {session.writerUid === uid ? partnerName : 'your'} turn to write →
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <HelpModal
        visible={help.visible}
        title="Two Truths One Lie"
        description="The app gives you 3 statements about yourself. Pick the one that's NOT true — that's the lie. Your partner guesses which one."
        tips={[
          "The app generates 3 statements, you just tap the one that's not true",
          "Tap '↻ Get different statements' if none fit well",
          "Your partner sees all 3 and tries to spot the lie",
          "Wrong guess = guesser does the dare, right guess = you do the dare",
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },
  resetBtn: { width: 60, alignItems: 'flex-end' },
  resetBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  picker: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.md },
  pickerIntro: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, textAlign: 'center', lineHeight: 24 },
  pickerLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.sm },
  levelCard: { borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, ...Shadow.sm },
  levelEmoji: { fontSize: 36 },
  levelInfo: { flex: 1 },
  levelLabel: { fontFamily: Fonts.heading, fontSize: 22 },
  levelSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  levelArrow: { fontFamily: Fonts.heading, fontSize: 28 },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.lg },

  roundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  scoreText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  turnBadge: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radius.full, alignItems: 'center' },
  turnText: { fontFamily: Fonts.bodyBold, fontSize: 14 },

  hint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  statementCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 2, borderColor: Colors.border, ...Shadow.sm },
  statementCardLie: { borderColor: Colors.error, backgroundColor: '#FFF3F3' },
  statementCardLeft: { flex: 1 },
  statementCardText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  statementCardTextLie: { color: Colors.error },
  statementCardBadge: { paddingVertical: 6, paddingHorizontal: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.border },
  statementCardBadgeLie: { backgroundColor: Colors.error, borderColor: Colors.error },
  statementCardBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted },
  statementCardBadgeTextLie: { color: Colors.white },
  refreshBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  refreshBtnText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  waitingCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  waitingEmoji: { fontSize: 40 },
  waitingText: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, textAlign: 'center' },
  waitingHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  guessCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  guessNum: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy, minWidth: 28 },
  guessText: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },

  resultCard: { borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  resultEmoji: { fontSize: 40 },
  resultTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, textAlign: 'center' },
  resultSub: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },

  dareCard: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm, ...Shadow.sm },
  dareBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  dareText: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, lineHeight: 28 },

  actionBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  actionBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
