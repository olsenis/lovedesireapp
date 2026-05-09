import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
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

export default function TwoTruthsScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [session, setSession] = useState<TwoTruthsSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [statements, setStatements] = useState(['', '', '']);
  const [lie, setLie] = useState<number | null>(null);
  const help = useHelp('two-truths');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'Partner';
  const myName = profile?.name ?? 'You';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeTwoTruths(coupleId, (s) => { setSession(s); setLoading(false); });
  }, [coupleId]);

  const isWriter = session?.writerUid === uid;
  const cfg = DARE_LEVEL_CONFIG[session?.dareLevel ?? 'flirty'];

  const handleStart = async (level: DareLevel) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startTwoTruths(coupleId, uid, level);
  };

  const handleSubmitStatements = async () => {
    if (!coupleId || statements.some(s => !s.trim()) || lie === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await submitStatements(coupleId, statements, lie);
    setStatements(['', '', '']);
    setLie(null);
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
    setStatements(['', '', '']);
    setLie(null);
    await resetTwoTruths(coupleId);
  };

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (!loading && (!session || session.round === 0)) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Two Truths One Lie</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.picker}>
          <Text style={styles.pickerIntro}>
            Write 2 truths and 1 lie. Your partner guesses which is the lie.{'\n'}
            Wrong guess = dare. Right guess = you do the dare.
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
              >
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
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Two Truths One Lie</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
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
            <Text style={styles.hint}>Write 2 things that are TRUE and 1 that is FALSE. Mark the lie.</Text>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.statementRow}>
                <TextInput
                  style={[styles.input, lie === i && styles.inputLie]}
                  placeholder={`Statement ${i + 1}`}
                  placeholderTextColor={Colors.muted}
                  value={statements[i]}
                  onChangeText={t => { const s = [...statements]; s[i] = t; setStatements(s); }}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.lieBtn, lie === i && styles.lieBtnActive]}
                  onPress={() => setLie(lie === i ? null : i)}
                >
                  <Text style={[styles.lieBtnText, lie === i && styles.lieBtnTextActive]}>
                    {lie === i ? '🤥 LIE' : 'Lie?'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.actionBtn, (statements.some(s => !s.trim()) || lie === null) && { opacity: 0.4 }]}
              onPress={handleSubmitStatements}
              disabled={statements.some(s => !s.trim()) || lie === null}
              activeOpacity={0.85}
            >
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
              <TouchableOpacity key={i} style={styles.guessCard} onPress={() => handleGuess(i)} activeOpacity={0.85}>
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

            <TouchableOpacity style={styles.actionBtn} onPress={handleNext} activeOpacity={0.85}>
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
        description="Write 2 truths and 1 lie. Your partner guesses which is the lie on their own phone."
        tips={[
          "Write privately, your partner can't see until you submit",
          "Mark which statement is the lie before sending",
          "Wrong guess = guesser does the dare",
          "Right guess = writer does the dare",
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

  statementRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  input: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border, minHeight: 56 },
  inputLie: { borderColor: Colors.error, backgroundColor: '#FFF3F3' },
  lieBtn: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: 'center', minWidth: 64, marginTop: 2 },
  lieBtnActive: { backgroundColor: Colors.error, borderColor: Colors.error },
  lieBtnText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted },
  lieBtnTextActive: { color: Colors.white },

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
