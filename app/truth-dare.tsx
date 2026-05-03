import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { DARES, TRUTHS, DARE_LEVEL_CONFIG, DareLevel } from '../constants/content';
import { TruthDareSession, subscribeTruthDare, startTruthDare, playCard, nextTurn, resetTruthDare, submitTruthAnswer, confirmDare, skipCard } from '../services/truthDareService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const LEVELS: DareLevel[] = ['sweet', 'flirty', 'spicy'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function TruthDareScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [session, setSession] = useState<TruthDareSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const help = useHelp('truth-dare');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId) return;
    const unsub = subscribeTruthDare(coupleId, (s) => { setSession(s); setLoading(false); });
    return unsub;
  }, [coupleId]);

  const isMyTurn = session?.turnUid === uid;
  const cfg = DARE_LEVEL_CONFIG[session?.level ?? 'flirty'];

  const handleStart = async (level: DareLevel) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startTruthDare(coupleId, uid, level);
  };

  const handleChoose = async (type: 'truth' | 'dare') => {
    if (!coupleId || !session) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pool = type === 'truth'
      ? TRUTHS.filter(t => t.level === session.level)
      : DARES.filter(d => d.level === session.level);
    if (pool.length === 0) return;
    await playCard(coupleId, { type, text: pickRandom(pool).text });
  };

  const handleConfirmDare = async () => {
    if (!coupleId || !session) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await confirmDare(coupleId, uid, session);
  };

  const handleSkip = async () => {
    if (!coupleId || !session || !partnerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await skipCard(coupleId, session, uid, partnerId);
  };

  const handleSubmitAnswer = async () => {
    if (!coupleId || !answerText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await submitTruthAnswer(coupleId, uid, answerText.trim());
    setAnswerText('');
  };

  const handleDone = async () => {
    if (!coupleId || !session || !partnerId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAnswerText('');
    await nextTurn(coupleId, session, uid, partnerId);
  };

  const handleReset = async () => {
    if (!coupleId) return;
    await resetTruthDare(coupleId);
  };

  // ── Picker (no active game) ──────────────────────────────────────────────────
  if (!loading && (!session || session.round === 0)) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>Truth or Dare</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.picker}>
          <Text style={styles.pickerIntro}>
            Take turns on your own phones. When it's your turn, pick Truth or Dare — your partner sees the result instantly.
          </Text>
          {LEVELS.map(level => {
            const c = DARE_LEVEL_CONFIG[level];
            return (
              <TouchableOpacity key={level} style={[styles.levelCard, { backgroundColor: c.color }]} onPress={() => handleStart(level)} activeOpacity={0.85}>
                <Text style={styles.levelEmoji}>{c.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelLabel, { color: c.textColor }]}>{c.label}</Text>
                  <Text style={styles.levelSub}>You go first · partner joins automatically</Text>
                </View>
                <Text style={[styles.levelArrow, { color: c.textColor }]}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <HelpModal visible={help.visible} title="Truth or Dare"
          description="A real 2-phone game. Take turns picking Truth or Dare — your partner sees your choice instantly on their phone."
          tips={["One partner starts and picks the level","When it's your turn — you see Truth and Dare buttons","Your partner sees 'Waiting for you...'","When the card appears, both phones show it at the same time"]}
          onDismiss={help.dismiss} onDismissAll={help.dismissAll} />
      </View>
    );
  }

  if (!session) return null;

  // ── Active game ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Truth or Dare</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}><Text style={styles.resetBtnText}>↺ New</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Level selector */}
        <View style={styles.levelSegment}>
          {LEVELS.map(level => {
            const c = DARE_LEVEL_CONFIG[level];
            const active = session.level === level;
            return (
              <TouchableOpacity
                key={level}
                style={[styles.levelTab, active && { backgroundColor: c.color }]}
                onPress={async () => { if (coupleId) await startTruthDare(coupleId, uid, level); }}
                activeOpacity={0.8}
              >
                <Text style={styles.levelTabEmoji}>{c.emoji}</Text>
                <Text style={[styles.levelTabLabel, active && { color: c.textColor }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── PHASE: picking ─────────────────────────────────────────── */}
        {session.phase === 'picking' && isMyTurn && (
          <>
            <View style={[styles.turnBadge, { backgroundColor: cfg.color }]}>
              <Text style={[styles.turnText, { color: cfg.textColor }]}>
                Your turn — challenge {partner?.name ?? 'partner'}:
              </Text>
            </View>
            <View style={styles.choiceRow}>
              <TouchableOpacity style={[styles.choiceBtn, styles.truthBtn]} onPress={() => handleChoose('truth')} activeOpacity={0.85}>
                <Text style={styles.choiceBtnEmoji}>🤔</Text>
                <Text style={styles.choiceBtnLabel}>Truth</Text>
                <Text style={styles.choiceBtnSub}>{partner?.name ?? 'Partner'} answers a question</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.choiceBtn, { borderColor: cfg.textColor }]} onPress={() => handleChoose('dare')} activeOpacity={0.85}>
                <Text style={styles.choiceBtnEmoji}>{cfg.emoji}</Text>
                <Text style={[styles.choiceBtnLabel, { color: cfg.textColor }]}>Dare</Text>
                <Text style={styles.choiceBtnSub}>{partner?.name ?? 'Partner'} does a challenge</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {session.phase === 'picking' && !isMyTurn && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>🎲</Text>
            <Text style={styles.waitingText}>
              {partner?.name ?? 'Partner'} is choosing your challenge…
            </Text>
            <Text style={styles.waitingHint}>Get ready — Truth or Dare is coming your way</Text>
          </View>
        )}

        {/* ── PHASE: answering ─────────────────────────────────────────── */}
        {session.phase === 'answering' && session.card && (
          <View style={[styles.cardView, { borderLeftColor: session.card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
            <View style={styles.cardTypeRow}>
              <Text style={styles.cardTypeEmoji}>{session.card.type === 'truth' ? '🤔' : cfg.emoji}</Text>
              <Text style={[styles.cardTypeBadge, { color: session.card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
                {session.card.type === 'truth' ? 'Truth' : `${cfg.label} Dare`}
              </Text>
            </View>
            <Text style={styles.cardText}>{session.card.text}</Text>

            {/* ── TRUTH ── */}
            {session.card.type === 'truth' && isMyTurn && (
              <View style={styles.sentBanner}>
                <Text style={styles.sentText}>✅ Question sent to {partner?.name ?? 'partner'}!</Text>
                <Text style={styles.sentHint}>Waiting for their answer…</Text>
              </View>
            )}

            {/* Skip */}
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip →</Text>
            </TouchableOpacity>
            {session.card.type === 'truth' && !isMyTurn && (
              <>
                <Text style={styles.answerPrompt}>Your truth — answer honestly:</Text>
                <TextInput
                  style={styles.answerInput2}
                  placeholder="Type your answer here..."
                  placeholderTextColor={Colors.muted}
                  value={answerText}
                  onChangeText={setAnswerText}
                  multiline
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.shareBtn, !answerText.trim() && { opacity: 0.4 }]}
                  onPress={handleSubmitAnswer}
                  disabled={!answerText.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.shareBtnText}>Send my answer →</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── DARE — sequential: partner first, then picker confirms ── */}
            {session.card.type === 'dare' && (() => {
              const confirmed = session.card.dareConfirmed ?? [];
              const iConfirmed = confirmed.includes(uid);
              const theyConfirmed = !!partnerId && confirmed.includes(partnerId);

              if (isMyTurn) {
                // PICKER
                if (!theyConfirmed) {
                  // Eva hasn't done it yet — show waiting
                  return (
                    <View style={styles.sentBanner}>
                      <Text style={styles.sentText}>✅ Dare sent to {partner?.name ?? 'partner'}!</Text>
                      <Text style={styles.sentHint}>Waiting for them to do it and confirm…</Text>
                    </View>
                  );
                } else if (!iConfirmed) {
                  // Eva confirmed — now picker confirms they saw it happen
                  return (
                    <TouchableOpacity style={styles.dareConfirmBtn} onPress={handleConfirmDare} activeOpacity={0.85}>
                      <Text style={styles.dareConfirmText}>✓ {partner?.name ?? 'Partner'} did it — confirm!</Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              } else {
                // PARTNER (Eva)
                if (!iConfirmed) {
                  // Eva needs to confirm she did it
                  return (
                    <TouchableOpacity style={styles.dareConfirmBtn} onPress={handleConfirmDare} activeOpacity={0.85}>
                      <Text style={styles.dareConfirmText}>✓ I did it!</Text>
                    </TouchableOpacity>
                  );
                } else {
                  // Eva confirmed, waiting for picker
                  return (
                    <View style={styles.sentBanner}>
                      <Text style={styles.sentText}>✓ Done — waiting for {partner?.name ?? 'partner'} to confirm…</Text>
                    </View>
                  );
                }
              }
            })()}
          </View>
        )}

        {/* ── PHASE: done ──────────────────────────────────────────────── */}
        {session.phase === 'done' && session.card && (
          <View style={[styles.cardView, { borderLeftColor: session.card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
            <View style={styles.cardTypeRow}>
              <Text style={styles.cardTypeEmoji}>{session.card.type === 'truth' ? '🤔' : cfg.emoji}</Text>
              <Text style={[styles.cardTypeBadge, { color: session.card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
                {session.card.type === 'truth' ? 'Truth' : `${cfg.label} Dare`}
              </Text>
            </View>
            <Text style={styles.cardText}>{session.card.text}</Text>

            {/* Show answer for truths */}
            {session.card.type === 'truth' && session.card.answer && (
              <View style={styles.answerReveal}>
                <Text style={styles.answerLabel}>{!isMyTurn ? 'Your answer:' : `${partner?.name ?? 'Partner'}'s answer:`}</Text>
                <Text style={styles.answerText}>{session.card.answer}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Done — {partner?.name ?? 'partner'}'s turn →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scores */}
        {(session.scores[uid] ?? 0) + (session.scores[partnerId ?? ''] ?? 0) > 0 && (
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreNum}>{session.scores[uid] ?? 0}</Text>
              <Text style={styles.scoreLabel}>You</Text>
            </View>
            <Text style={styles.scoreDivider}>—</Text>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreNum}>{session.scores[partnerId ?? ''] ?? 0}</Text>
              <Text style={styles.scoreLabel}>{partner?.name ?? 'Partner'}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  roundText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted, width: 60, textAlign: 'right' },
  resetBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  resetBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  answerPrompt: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted, marginTop: Spacing.sm },
  answerInput2: { backgroundColor: Colors.cream, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.border },
  shareBtn: { backgroundColor: '#1565C0', paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  shareBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },
  waitingCard2: { backgroundColor: Colors.blush, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  sentBanner: { backgroundColor: '#E8F5E9', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  sentText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.success },
  sentHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: 4 },
  dareConfirmBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.md },
  dareConfirmBtnDone: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: Colors.success },
  dareConfirmText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  dareConfirmTextDone: { color: Colors.success },
  skipBtn: { alignItems: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.xs },
  skipText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  picker: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.md },
  pickerIntro: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  levelCard: { borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, ...Shadow.sm },
  levelEmoji: { fontSize: 36 },
  levelInfo: { flex: 1 },
  levelLabel: { fontFamily: Fonts.heading, fontSize: 22 },
  levelSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  levelArrow: { fontFamily: Fonts.heading, fontSize: 28 },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.lg },

  levelSegment: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  levelTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  levelTabEmoji: { fontSize: 18 },
  levelTabLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  turnBadge: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radius.full, alignItems: 'center' },
  turnText: { fontFamily: Fonts.bodyBold, fontSize: 15 },

  choiceRow: { flexDirection: 'row', gap: Spacing.md },
  choiceBtn: { flex: 1, borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderWidth: 2, backgroundColor: Colors.white, ...Shadow.sm },
  truthBtn: { borderColor: Colors.border },
  choiceBtnEmoji: { fontSize: 36 },
  choiceBtnLabel: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  choiceBtnSub: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },

  cardView: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, ...Shadow.sm },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTypeEmoji: { fontSize: 22 },
  cardTypeBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  cardText: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, lineHeight: 30 },
  doneBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.sm },
  doneBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  answerInput: { backgroundColor: Colors.cream, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.sm },
  waitingAnswerHint: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', marginTop: Spacing.sm },
  answerReveal: { backgroundColor: '#E3F2FD', borderRadius: Radius.lg, padding: Spacing.md, gap: 4, marginTop: Spacing.sm },
  answerLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#1565C0', textTransform: 'uppercase', letterSpacing: 0.8 },
  answerText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },

  waitingCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  waitingEmoji: { fontSize: 40 },
  waitingText: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, textAlign: 'center' },
  waitingHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  scoreItem: { alignItems: 'center', gap: 2 },
  scoreNum: { fontFamily: Fonts.heading, fontSize: 36, color: Colors.burgundy },
  scoreLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  scoreDivider: { fontFamily: Fonts.bodyItalic, fontSize: 20, color: Colors.muted },
});
