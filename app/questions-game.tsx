import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { QUESTION_CATEGORY_CONFIG, QuestionCategory } from '../constants/content';
import {
  DailyQuestionDoc, QuestionStreak,
  subscribeDailyQuestions, subscribeStreak,
  submitAnswer, checkAndUpdateStreak, bothAnswered,
} from '../services/dailyQuestionsService';
import { notifyPartner } from '../services/notificationService';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

const ALL_CATEGORIES: QuestionCategory[] = ['fun', 'deep', 'romantic', 'spicy', 'therapy', 'fantasy'];

export default function QuestionsGameScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const help = useHelp('questions');

  const [category, setCategory] = useState<QuestionCategory>('romantic');
  const [dailyDoc, setDailyDoc] = useState<DailyQuestionDoc | null>(null);
  const [streak, setStreak] = useState<QuestionStreak>({ count: 0, lastDate: '' });
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'Partner';

  useEffect(() => {
    if (!coupleId) return;
    const u1 = subscribeDailyQuestions(coupleId, setDailyDoc);
    const u2 = subscribeStreak(coupleId, setStreak);
    return () => { u1(); u2(); };
  }, [coupleId]);

  const catItems = (dailyDoc?.items ?? [])
    .map((q, gi) => ({ q, gi }))
    .filter(({ q }) => q.category === category);

  const cfg = QUESTION_CATEGORY_CONFIG[category];

  const myAnswer = (gi: number) => dailyDoc?.answers?.[uid]?.[String(gi)] ?? null;
  const partnerAnswer = (gi: number) => (partnerId ? dailyDoc?.answers?.[partnerId]?.[String(gi)] ?? null : null);
  const revealed = (gi: number) => !!partnerId && !!dailyDoc && bothAnswered(dailyDoc, gi, uid, partnerId);

  const answeredCount = catItems.filter(({ gi }) => !!myAnswer(gi)).length;

  const handleSubmit = async (gi: number) => {
    const text = (drafts[gi] ?? '').trim();
    if (!coupleId || !dailyDoc || !text) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await submitAnswer(coupleId, uid, gi, text);
    setDrafts(d => { const n = { ...d }; delete n[gi]; return n; });

    const partnerAlreadyAnswered = !!(partnerId && dailyDoc.answers?.[partnerId]?.[String(gi)]);
    if (partnerAlreadyAnswered) {
      // Both answered — update streak
      checkAndUpdateStreak(coupleId);
    } else {
      // Notify partner it's their turn
      notifyPartner(coupleId, uid, 'Questions 💬', `${profile?.name ?? 'Your partner'} answered a question, your turn!`);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Questions</Text>
        <View style={styles.streakWrap}>
          {streak.count > 0 && (
            <Text style={styles.streak}>🔥 {streak.count}</Text>
          )}
        </View>
      </View>

      {/* Category tabs */}
      <View style={styles.catRow}>
        {ALL_CATEGORIES.map((cat) => {
          const c = QUESTION_CATEGORY_CONFIG[cat];
          const active = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catBtn, active && { backgroundColor: c.color, borderColor: Colors.border }]}
              onPress={() => setCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={styles.catEmoji}>{c.emoji}</Text>
              <Text style={[styles.catLabel, active && { color: Colors.text, fontFamily: Fonts.bodyBold }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress */}
        <View style={[styles.progress, { borderLeftColor: cfg.color }]}>
          <Text style={styles.progressText}>
            {answeredCount}/3 answered today · {cfg.emoji} {cfg.label}
          </Text>
        </View>

        {catItems.map(({ q, gi }) => {
          const mine = myAnswer(gi);
          const theirs = partnerAnswer(gi);
          const both = revealed(gi);

          return (
            <View key={gi} style={[styles.card, { backgroundColor: both ? '#F1F8E9' : cfg.color }, both && { borderColor: Colors.success }]}>
              <Text style={styles.question}>{q.text}</Text>

              {/* Both answered — reveal */}
              {both && (
                <View style={styles.revealWrap}>
                  <View style={styles.revealBox}>
                    <Text style={styles.revealName}>You</Text>
                    <Text style={styles.revealAnswer}>{mine}</Text>
                  </View>
                  <View style={[styles.revealBox, { backgroundColor: '#C8E6C9' }]}>
                    <Text style={styles.revealName}>{partnerName}</Text>
                    <Text style={styles.revealAnswer}>{theirs}</Text>
                  </View>
                </View>
              )}

              {/* I answered, partner hasn't */}
              {mine && !both && (
                <View style={styles.waitBanner}>
                  <Text style={styles.waitText}>✓ Sent! Waiting for {partnerName}…</Text>
                  <Text style={styles.waitAnswer}>Your answer: {mine}</Text>
                </View>
              )}

              {/* I haven't answered yet */}
              {!mine && (
                <View style={styles.inputWrap}>
                  {theirs && (
                    <Text style={styles.partnerWaiting}>{partnerName} already answered, your turn!</Text>
                  )}
                  <TextInput
                    style={styles.input}
                    placeholder="Type your answer..."
                    placeholderTextColor={Colors.muted}
                    value={drafts[gi] ?? ''}
                    onChangeText={t => setDrafts(d => ({ ...d, [gi]: t }))}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, !(drafts[gi] ?? '').trim() && { opacity: 0.4 }]}
                    onPress={() => handleSubmit(gi)}
                    disabled={!(drafts[gi] ?? '').trim()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.sendBtnText}>Send answer →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {catItems.length === 0 && (
          <Text style={styles.loading}>Loading today's questions…</Text>
        )}
      </ScrollView>

      <HelpModal
        visible={help.visible}
        title="Questions Game"
        description="3 questions per category every day. Answer privately, then both answers reveal at the same time."
        tips={[
          "Both partners see the same 3 questions each day",
          "Type your answer and send it, your partner can't see it yet",
          "When your partner also answers, both answers are revealed",
          "Answer every day to build your streak 🔥",
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
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  streakWrap: { width: 60, alignItems: 'flex-end' },
  streak: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingVertical: Spacing.sm },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: Spacing.md,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  catEmoji: { fontSize: 16 },
  catLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.sm, gap: Spacing.md },

  progress: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4,
  },
  progressText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  card: {
    borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  question: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, lineHeight: 30 },

  revealWrap: { flexDirection: 'row', gap: Spacing.sm },
  revealBox: {
    flex: 1, backgroundColor: '#DCEDC8', borderRadius: Radius.lg,
    padding: Spacing.md, gap: 4,
  },
  revealName: { fontFamily: Fonts.bodyBold, fontSize: 11, color: '#33691E', textTransform: 'uppercase', letterSpacing: 0.6 },
  revealAnswer: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },

  waitBanner: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  waitText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.success },
  waitAnswer: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  partnerWaiting: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },

  inputWrap: { gap: Spacing.sm },
  input: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
    minHeight: 72, borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    backgroundColor: Colors.burgundy, paddingVertical: Spacing.md,
    borderRadius: Radius.full, alignItems: 'center',
  },
  sendBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  loading: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', marginTop: Spacing.xl },
});
