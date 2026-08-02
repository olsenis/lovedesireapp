import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { WYRSession, WYRAnswer, subscribeWYR, startWYR, answerWYR, nextWYRQuestion, resetWYR, saveMatchToList } from '../services/wyrService';
import { TodoCategory } from '../services/todoService';
import { WYR_QUESTIONS, WYR_LEVEL_CONFIG, WYRLevel } from '../constants/content';
import { notifyPartner } from '../services/notificationService';
import { useSubscription } from '../hooks/useSubscription';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const LEVELS: WYRLevel[] = ['playful', 'romantic', 'spicy'];

export default function WouldYouRatherScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [session, setSession] = useState<WYRSession | null>(null);
  const [loading, setLoading] = useState(true);
  // Confirms a mid-session level change — hidden behind a modal because
  // resetWYR wipes the couple's score and current question index, which
  // an accidental tap on the level badge would otherwise silently
  // destroy.
  const [showChangeLevel, setShowChangeLevel] = useState(false);
  const help = useHelp('would-you-rather');
  const { isSubscribed } = useSubscription();

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId) return;
    const unsub = subscribeWYR(coupleId, (s) => { setSession(s); setLoading(false); });
    return unsub;
  }, [coupleId]);

  const levelQuestions = session ? WYR_QUESTIONS.filter(q => q.level === session.level) : [];
  const currentQ = session ? levelQuestions[session.questionIndex % levelQuestions.length] : null;

  const myAnswer = session?.answers[uid];
  const partnerAnswer = session?.answers[partnerId ?? ''];
  const bothAnswered = session?.revealed;
  const matched = bothAnswered && myAnswer === partnerAnswer;

  const handleStart = async (level: WYRLevel) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startWYR(coupleId, level);
  };

  const handleAnswer = async (answer: WYRAnswer) => {
    if (!coupleId || !session || myAnswer) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await answerWYR(coupleId, uid, answer, session);
    const partnerHasAnswered = partnerId && !!session.answers[partnerId];
    if (!partnerHasAnswered) {
      notifyPartner(coupleId, uid, 'Would You Rather 🤔', `${profile?.name ?? 'Your partner'} answered, your turn!`);
    }
  };

  const handleNext = async () => {
    if (!coupleId || !session || !partnerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await nextWYRQuestion(coupleId, session, [uid, partnerId]);
  };

  const handleReset = async () => {
    if (!coupleId) return;
    await resetWYR(coupleId);
  };

  // Category mapping. Playful/Romantic mostly describe date-shaped
  // scenarios (dinners, holidays, weekends), so they land under Date
  // Ideas. Spicy describes intimate scenarios, so → Intimacy. Users can
  // reclassify from the Together List if the auto-pick is off.
  const saveCategory = (level: WYRLevel): TodoCategory => (level === 'spicy' ? 'intimacy' : 'dates');
  const saveCategoryLabel = (cat: TodoCategory) => (cat === 'intimacy' ? 'Intimacy' : 'Date Ideas');

  const handleSaveMatch = async () => {
    if (!coupleId || !session || !currentQ || !matched || session.savedToList) return;
    const winningText = myAnswer === 'a' ? currentQ.a : currentQ.b;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveMatchToList(coupleId, uid, winningText, saveCategory(session.level));
  };

  if (!loading && !session) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>Would You Rather</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.picker}>
          <Text style={styles.pickerIntro}>Both of you answer at the same time, then reveal. If you match, you score a point!</Text>
          {LEVELS.map(level => {
            const cfg = WYR_LEVEL_CONFIG[level];
            return (
              <TouchableOpacity key={level} style={[styles.levelCard, { backgroundColor: cfg.color }]} onPress={() => { if (level === 'spicy' && !isSubscribed) { router.push('/upgrade' as any); return; } handleStart(level); }} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.levelEmoji}>{cfg.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelLabel, { color: cfg.textColor }]}>{cfg.label}</Text>
                  <Text style={styles.levelCount}>{level === 'spicy' && !isSubscribed ? '🔒 Premium' : `${WYR_QUESTIONS.filter(q => q.level === level).length} questions`}</Text>
                </View>
                <Text style={[styles.levelArrow, { color: cfg.textColor }]}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <HelpModal visible={help.visible} title="Would You Rather"
          description="Both partners answer at the same time, then reveal. See if you match, and talk about why you chose differently."
          tips={["Pick a level and both answer simultaneously","Your answer is hidden until your partner also answers","If you match → +1 point","If you don't → discuss why! That's the fun part"]}
          onDismiss={help.dismiss} onDismissAll={help.dismissAll} />
      </View>
    );
  }

  if (!currentQ || !session) return null;
  const cfg = WYR_LEVEL_CONFIG[session.level];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Would You Rather</Text>
        <View style={styles.scoreWrap}>
          <Text style={[styles.score, { color: cfg.textColor }]}>{session.score.match}/{session.score.total}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Level badge doubles as the escape hatch: tap to change level
            mid-session. Without this, once startWYR runs the couple is
            locked into that level until they finish all 90 questions.
            Modal-gated so an accidental tap doesn't nuke the score. */}
        <TouchableOpacity
          style={[styles.levelBadge, { backgroundColor: cfg.color }]}
          onPress={() => setShowChangeLevel(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Current level: ${cfg.label}. Tap to change.`}
        >
          <Text style={styles.levelBadgeEmoji}>{cfg.emoji}</Text>
          <Text style={[styles.levelBadgeText, { color: cfg.textColor }]}>{cfg.label}</Text>
          <Text style={[styles.levelBadgeChange, { color: cfg.textColor }]}>Change ›</Text>
        </TouchableOpacity>

        <Text style={styles.prompt}>Would you rather…</Text>

        {/* Option A */}
        <TouchableOpacity
          style={[styles.optionBtn, myAnswer === 'a' && { backgroundColor: cfg.textColor, borderColor: cfg.textColor }, bothAnswered && partnerAnswer === 'a' && styles.partnerPicked]}
          onPress={() => handleAnswer('a')}
          disabled={!!myAnswer}
          activeOpacity={0.85}
         accessibilityRole="button">
          <Text style={[styles.optionLetter, myAnswer === 'a' && { color: Colors.white }]}>A</Text>
          <Text style={[styles.optionText, myAnswer === 'a' && { color: Colors.white }]}>{currentQ.a}</Text>
          {bothAnswered && partnerAnswer === 'a' && <Text style={styles.partnerTag}>{partner?.name ?? 'Partner'}</Text>}
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.or}>or</Text>
          <View style={styles.orLine} />
        </View>

        {/* Option B */}
        <TouchableOpacity
          style={[styles.optionBtn, myAnswer === 'b' && { backgroundColor: cfg.textColor, borderColor: cfg.textColor }, bothAnswered && partnerAnswer === 'b' && styles.partnerPicked]}
          onPress={() => handleAnswer('b')}
          disabled={!!myAnswer}
          activeOpacity={0.85}
         accessibilityRole="button">
          <Text style={[styles.optionLetter, myAnswer === 'b' && { color: Colors.white }]}>B</Text>
          <Text style={[styles.optionText, myAnswer === 'b' && { color: Colors.white }]}>{currentQ.b}</Text>
          {bothAnswered && partnerAnswer === 'b' && <Text style={styles.partnerTag}>{partner?.name ?? 'Partner'}</Text>}
        </TouchableOpacity>

        {/* Status */}
        {!myAnswer && (
          <Text style={styles.waitingHint}>Pick your answer, it's hidden until your partner answers too</Text>
        )}
        {myAnswer && !bothAnswered && (
          <Text style={styles.waitingHint}>Waiting for {partner?.name ?? 'partner'} to answer…</Text>
        )}

        {/* Reveal */}
        {bothAnswered && (
          <View style={[styles.resultCard, { backgroundColor: matched ? '#E8F5E9' : '#FFF9C4' }]}>
            <Text style={styles.resultEmoji}>{matched ? '🎉' : '🤔'}</Text>
            <Text style={styles.resultTitle}>{matched ? 'You match!' : 'You differ!'}</Text>
            {currentQ.discussion && (
              <Text style={styles.discussionPrompt}>💬 {currentQ.discussion}</Text>
            )}
            {/* Save-to-list only on match. Match already means both partners
                chose the same option, so no double-confirm handshake needed —
                one tap saves in the couple's name. Second tap on the other
                phone no-ops via transaction guard on savedToList. */}
            {matched && (
              session.savedToList ? (
                <View style={styles.savedChip}>
                  <Text style={styles.savedChipText}>
                    ✓ Saved to {saveCategoryLabel(saveCategory(session.level))}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveMatch}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Save to ${saveCategoryLabel(saveCategory(session.level))}`}
                >
                  <Text style={styles.saveBtnText}>+ Save to our list</Text>
                </TouchableOpacity>
              )
            )}
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: cfg.textColor }]} onPress={handleNext} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.nextBtnText}>Next question →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ConfirmModal
        visible={showChangeLevel}
        title="Change level?"
        message={`Your current score (${session.score.match}/${session.score.total}) will reset. You can start a new level right after.`}
        confirmLabel="Change level"
        destructive
        onConfirm={async () => {
          setShowChangeLevel(false);
          await handleReset();
        }}
        onCancel={() => setShowChangeLevel(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  scoreWrap: { width: 60, alignItems: 'flex-end' },
  score: { fontFamily: Fonts.bodyBold, fontSize: 14 },

  picker: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.md },
  pickerIntro: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  levelCard: { borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, ...Shadow.sm },
  levelEmoji: { fontSize: 36 },
  levelInfo: { flex: 1 },
  levelLabel: { fontFamily: Fonts.heading, fontSize: 22 },
  levelCount: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  levelArrow: { fontFamily: Fonts.heading, fontSize: 28 },

  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.full },
  levelBadgeEmoji: { fontSize: 16 },
  levelBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 13 },
  levelBadgeChange: { fontFamily: Fonts.bodyItalic, fontSize: 11, marginLeft: 4, opacity: 0.75 },

  prompt: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, textAlign: 'center' },

  optionBtn: {
    borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, ...Shadow.sm,
  },
  partnerPicked: { borderColor: Colors.rose },
  optionLetter: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy, minWidth: 28 },
  optionText: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  partnerTag: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.rose },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  or: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted },

  waitingHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  resultCard: { borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  resultEmoji: { fontSize: 36 },
  resultTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  discussionPrompt: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  nextBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderRadius: Radius.full, marginTop: Spacing.sm },
  nextBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },
  // Save-to-list affordance on match. Outline burgundy so it reads as a
  // secondary action next to the primary Next question button — we want
  // Next to remain the visual default so the session flow doesn't slow.
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.burgundy,
    backgroundColor: Colors.white,
    marginTop: 6,
  },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, letterSpacing: 0.3 },
  // Post-save confirmation chip. Non-interactive, sits in the same slot
  // as the Save button so the layout doesn't jump.
  savedChip: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: '#C8E6C9',
    marginTop: 6,
  },
  savedChipText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: '#2E7D32', letterSpacing: 0.3 },
});
