import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { DARES, TRUTHS, DARE_LEVEL_CONFIG, DareLevel } from '../constants/content';
import {
  TruthDareSession, subscribeTruthDare, startTruthDare,
  playCard, nextTurn, resetTruthDare, submitTruthAnswer,
  confirmDare, skipCard,
} from '../services/truthDareService';
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
  const partnerName = partner?.name ?? 'Partner';

  useEffect(() => {
    if (!coupleId) return;
    const unsub = subscribeTruthDare(coupleId, (s) => { setSession(s); setLoading(false); });
    return unsub;
  }, [coupleId]);

  const isMyTurn = session?.turnUid === uid; // I am the PICKER this round
  const cfg = DARE_LEVEL_CONFIG[session?.level ?? 'flirty'];

  const myScore = session?.scores[uid] ?? 0;
  const partnerScore = session?.scores[partnerId ?? ''] ?? 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────
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

  const handleSubmitAnswer = async () => {
    if (!coupleId || !answerText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await submitTruthAnswer(coupleId, uid, answerText.trim());
    setAnswerText('');
  };

  const handleConfirmDare = async () => {
    if (!coupleId || !session) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await confirmDare(coupleId, uid, session);
  };

  const handleDone = async () => {
    if (!coupleId || !session || !partnerId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAnswerText('');
    await nextTurn(coupleId, session, uid, partnerId);
  };

  const handleSkip = async () => {
    if (!coupleId || !session || !partnerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnswerText('');
    await skipCard(coupleId, session, uid, partnerId);
  };

  const handleReset = async () => {
    if (!coupleId) return;
    setAnswerText('');
    await resetTruthDare(coupleId);
  };

  // ── Game picker (no active game) ─────────────────────────────────────────────
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
            A real 2-phone game. You challenge your partner — they answer or do the dare on their phone.
          </Text>
          {LEVELS.map(level => {
            const c = DARE_LEVEL_CONFIG[level];
            return (
              <TouchableOpacity key={level} style={[styles.levelCard, { backgroundColor: c.color }]} onPress={() => handleStart(level)} activeOpacity={0.85}>
                <Text style={styles.levelEmoji}>{c.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelLabel, { color: c.textColor }]}>{c.label}</Text>
                  <Text style={styles.levelSub}>You go first · partner joins on their phone</Text>
                </View>
                <Text style={[styles.levelArrow, { color: c.textColor }]}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <HelpModal
          visible={help.visible}
          title="Truth or Dare"
          description="Pick Truth or Dare for your partner — they see it on their phone and must respond."
          tips={[
            "Your turn = you challenge your partner",
            "Pick Truth → partner types their answer",
            "Pick Dare → partner confirms they did it, then you confirm",
            "Back saves the game — return anytime",
          ]}
          onDismiss={help.dismiss}
          onDismissAll={help.dismissAll}
        />
      </View>
    );
  }

  if (!session) return null;

  // ── Derived Dare confirmation state ──────────────────────────────────────────
  const dareConfirmed = session.card?.dareConfirmed ?? [];
  const partnerConfirmedDare = !!partnerId && dareConfirmed.includes(partnerId);
  const iConfirmedDare = dareConfirmed.includes(uid);

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

        {/* Round + turn badge */}
        <View style={[styles.turnBadge, { backgroundColor: cfg.color }]}>
          <Text style={[styles.turnText, { color: cfg.textColor }]}>
            Round {session.round} · {isMyTurn ? `Your turn — challenge ${partnerName}:` : `${partnerName}'s turn`}
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════
            PHASE: PICKING
        ═══════════════════════════════════════════════════════════ */}
        {session.phase === 'picking' && isMyTurn && (
          <View style={styles.choiceRow}>
            <TouchableOpacity style={[styles.choiceBtn, styles.truthBtn]} onPress={() => handleChoose('truth')} activeOpacity={0.85}>
              <Text style={styles.choiceBtnEmoji}>🤔</Text>
              <Text style={styles.choiceBtnLabel}>Truth</Text>
              <Text style={styles.choiceBtnSub}>{partnerName} answers a question</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.choiceBtn, { borderColor: cfg.textColor }]} onPress={() => handleChoose('dare')} activeOpacity={0.85}>
              <Text style={styles.choiceBtnEmoji}>{cfg.emoji}</Text>
              <Text style={[styles.choiceBtnLabel, { color: cfg.textColor }]}>Dare</Text>
              <Text style={styles.choiceBtnSub}>{partnerName} does a challenge</Text>
            </TouchableOpacity>
          </View>
        )}

        {session.phase === 'picking' && !isMyTurn && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>🎲</Text>
            <Text style={styles.waitingText}>{partnerName} is choosing your challenge…</Text>
            <Text style={styles.waitingHint}>Get ready — Truth or Dare is coming your way</Text>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PHASE: ANSWERING
        ═══════════════════════════════════════════════════════════ */}
        {session.phase === 'answering' && session.card && (
          <View style={[styles.cardView, { borderLeftColor: session.card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
            {/* Card header */}
            <View style={styles.cardTypeRow}>
              <Text style={styles.cardTypeEmoji}>{session.card.type === 'truth' ? '🤔' : cfg.emoji}</Text>
              <Text style={[styles.cardTypeBadge, { color: session.card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
                {session.card.type === 'truth' ? 'Truth' : `${cfg.label} Dare`}
              </Text>
            </View>
            <Text style={styles.cardText}>{session.card.text}</Text>

            {/* ── TRUTH: picker waits ── */}
            {session.card.type === 'truth' && isMyTurn && (
              <View style={styles.sentBanner}>
                <Text style={styles.sentText}>✅ Sent to {partnerName}! She's answering…</Text>
              </View>
            )}

            {/* ── TRUTH: partner answers ── */}
            {session.card.type === 'truth' && !isMyTurn && (
              <>
                <Text style={styles.answerPrompt}>Your truth — answer honestly:</Text>
                <TextInput
                  style={styles.answerInput}
                  placeholder="Type your answer here..."
                  placeholderTextColor={Colors.muted}
                  value={answerText}
                  onChangeText={setAnswerText}
                  multiline
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.sendBtn, !answerText.trim() && { opacity: 0.4 }]}
                  onPress={handleSubmitAnswer}
                  disabled={!answerText.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sendBtnText}>Send my answer →</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                  <Text style={styles.skipText}>Skip this one →</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── DARE: picker watches (partner hasn't confirmed yet) ── */}
            {session.card.type === 'dare' && isMyTurn && !partnerConfirmedDare && (
              <View style={styles.greyBanner}>
                <Text style={styles.greyBannerText}>✅ Dare sent to {partnerName}!</Text>
                <Text style={styles.greyBannerHint}>Waiting for them to do it and confirm…</Text>
              </View>
            )}

            {/* ── DARE: picker confirms after partner does ── */}
            {session.card.type === 'dare' && isMyTurn && partnerConfirmedDare && !iConfirmedDare && (
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmDare} activeOpacity={0.85}>
                <Text style={styles.confirmBtnText}>✓ {partnerName} did it — confirm!</Text>
              </TouchableOpacity>
            )}

            {/* ── DARE: partner does it ── */}
            {session.card.type === 'dare' && !isMyTurn && !iConfirmedDare && (
              <>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmDare} activeOpacity={0.85}>
                  <Text style={styles.confirmBtnText}>✓ I did it!</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                  <Text style={styles.skipText}>Skip this one →</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── DARE: partner confirmed, waiting for picker ── */}
            {session.card.type === 'dare' && !isMyTurn && iConfirmedDare && (
              <View style={styles.sentBanner}>
                <Text style={styles.sentText}>✓ Done! Waiting for {partnerName} to confirm…</Text>
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PHASE: DONE
        ═══════════════════════════════════════════════════════════ */}
        {session.phase === 'done' && session.card && (
          <View style={[styles.cardView, { borderLeftColor: session.card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
            <View style={styles.cardTypeRow}>
              <Text style={styles.cardTypeEmoji}>{session.card.type === 'truth' ? '🤔' : cfg.emoji}</Text>
              <Text style={[styles.cardTypeBadge, { color: session.card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
                {session.card.type === 'truth' ? 'Truth' : `${cfg.label} Dare`}
              </Text>
            </View>
            <Text style={styles.cardText}>{session.card.text}</Text>

            {/* Truth: show answer */}
            {session.card.type === 'truth' && session.card.answer && (
              <View style={styles.answerReveal}>
                <Text style={styles.answerRevealLabel}>
                  {session.card.answeredBy === uid ? 'Your answer:' : `${partnerName}'s answer:`}
                </Text>
                <Text style={styles.answerRevealText}>{session.card.answer}</Text>
              </View>
            )}

            {/* Dare: show confirmation */}
            {session.card.type === 'dare' && (
              <View style={styles.dareConfirmedBanner}>
                <Text style={styles.dareConfirmedText}>✓ Both confirmed!</Text>
              </View>
            )}

            <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Done — {isMyTurn ? partnerName : 'your'} turn →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Score */}
        {(myScore > 0 || partnerScore > 0) && (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>You {myScore} — {partnerName} {partnerScore}</Text>
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
  resetBtn: { width: 60, alignItems: 'flex-end' },
  resetBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

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
  turnText: { fontFamily: Fonts.bodyBold, fontSize: 14 },

  choiceRow: { flexDirection: 'row', gap: Spacing.md },
  choiceBtn: { flex: 1, borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderWidth: 2, backgroundColor: Colors.white, ...Shadow.sm },
  truthBtn: { borderColor: Colors.border },
  choiceBtnEmoji: { fontSize: 36 },
  choiceBtnLabel: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  choiceBtnSub: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },

  waitingCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  waitingEmoji: { fontSize: 40 },
  waitingText: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, textAlign: 'center' },
  waitingHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  cardView: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, ...Shadow.sm },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTypeEmoji: { fontSize: 22 },
  cardTypeBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  cardText: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, lineHeight: 30 },

  sentBanner: { backgroundColor: '#E8F5E9', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 4 },
  sentText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.success },

  greyBanner: { backgroundColor: Colors.cream, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  greyBannerText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  greyBannerHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  answerPrompt: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  answerInput: { backgroundColor: Colors.cream, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { backgroundColor: '#1565C0', paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  sendBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },

  confirmBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  confirmBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  skipBtn: { alignItems: 'center', paddingVertical: Spacing.xs },
  skipText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  answerReveal: { backgroundColor: '#E3F2FD', borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  answerRevealLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#1565C0', textTransform: 'uppercase', letterSpacing: 0.8 },
  answerRevealText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },

  dareConfirmedBanner: { backgroundColor: '#E8F5E9', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  dareConfirmedText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.success },

  doneBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.sm },
  doneBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  scoreRow: { alignItems: 'center', paddingVertical: Spacing.sm },
  scoreText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
});
