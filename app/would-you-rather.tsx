import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { WYRSession, WYRAnswer, subscribeWYR, startWYR, answerWYR, nextWYRQuestion, resetWYR } from '../services/wyrService';
import { WYR_QUESTIONS, WYR_LEVEL_CONFIG, WYRLevel } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const LEVELS: WYRLevel[] = ['playful', 'romantic', 'spicy'];

export default function WouldYouRatherScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [session, setSession] = useState<WYRSession | null>(null);
  const [loading, setLoading] = useState(true);
  const help = useHelp('would-you-rather');

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

  if (!loading && !session) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>Would You Rather</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.picker}>
          <Text style={styles.pickerIntro}>Both of you answer at the same time, then reveal. If you match, you score a point!</Text>
          {LEVELS.map(level => {
            const cfg = WYR_LEVEL_CONFIG[level];
            return (
              <TouchableOpacity key={level} style={[styles.levelCard, { backgroundColor: cfg.color }]} onPress={() => handleStart(level)} activeOpacity={0.85}>
                <Text style={styles.levelEmoji}>{cfg.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelLabel, { color: cfg.textColor }]}>{cfg.label}</Text>
                  <Text style={styles.levelCount}>{WYR_QUESTIONS.filter(q => q.level === level).length} questions</Text>
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
        <TouchableOpacity onPress={handleReset} style={styles.back}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Would You Rather</Text>
        <View style={styles.scoreWrap}>
          <Text style={[styles.score, { color: cfg.textColor }]}>{session.score.match}/{session.score.total}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.levelBadge, { backgroundColor: cfg.color }]}>
          <Text style={styles.levelBadgeEmoji}>{cfg.emoji}</Text>
          <Text style={[styles.levelBadgeText, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>

        <Text style={styles.prompt}>Would you rather…</Text>

        {/* Option A */}
        <TouchableOpacity
          style={[styles.optionBtn, myAnswer === 'a' && { backgroundColor: cfg.textColor, borderColor: cfg.textColor }, bothAnswered && partnerAnswer === 'a' && styles.partnerPicked]}
          onPress={() => handleAnswer('a')}
          disabled={!!myAnswer}
          activeOpacity={0.85}
        >
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
        >
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
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: cfg.textColor }]} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>Next question →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
});
