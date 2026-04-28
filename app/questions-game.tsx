import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { QUESTIONS, QUESTION_CATEGORY_CONFIG, QuestionCategory } from '../constants/content';
import {
  DailyQuestionDoc, subscribeDailyQuestions, markDiscussed, bothDiscussed,
} from '../services/dailyQuestionsService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

const ALL_CATEGORIES: QuestionCategory[] = ['fun', 'deep', 'romantic', 'spicy', 'therapy', 'fantasy'];

export default function QuestionsGameScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);

  const [mode, setMode] = useState<'daily' | 'free'>('daily');
  const [category, setCategory] = useState<QuestionCategory>('romantic');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dailyDoc, setDailyDoc] = useState<DailyQuestionDoc | null>(null);

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId || mode !== 'daily') return;
    return subscribeDailyQuestions(coupleId, setDailyDoc);
  }, [coupleId, mode]);

  // ── Free mode ────────────────────────────────────────────────────────────
  const freeFiltered = QUESTIONS.filter((q) => q.category === category);
  const freeCurrent = freeFiltered[index % freeFiltered.length];
  const freeCfg = QUESTION_CATEGORY_CONFIG[category];

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIndex((i) => (i + 1) % freeFiltered.length);
    setFlipped(false);
  };

  const flip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFlipped((f) => !f);
  };

  // ── Daily mode ───────────────────────────────────────────────────────────
  const dailyCatItems = (dailyDoc?.items ?? [])
    .map((q, gi) => ({ q, gi }))
    .filter(({ q }) => q.category === category);

  const dailyCfg = QUESTION_CATEGORY_CONFIG[category];

  const iDiscussed = (gi: number) => (dailyDoc?.discussed[uid] ?? []).includes(gi);
  const partnerDiscussed = (gi: number) =>
    !!partnerId && (dailyDoc?.discussed[partnerId] ?? []).includes(gi);
  const allDiscussed = (gi: number) =>
    !!partnerId && !!dailyDoc && bothDiscussed(dailyDoc, gi, uid, partnerId);

  const discussedCount = dailyCatItems.filter(({ gi }) => iDiscussed(gi)).length;

  const handleMarkDiscussed = async (gi: number) => {
    if (!coupleId || !dailyDoc) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markDiscussed(coupleId, uid, gi, dailyDoc);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Questions</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'daily' && styles.modeBtnActive]}
          onPress={() => setMode('daily')}
          activeOpacity={0.8}
        >
          <Text style={[styles.modeBtnText, mode === 'daily' && styles.modeBtnTextActive]}>
            📅 Daily · 3/day
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'free' && styles.modeBtnActive]}
          onPress={() => setMode('free')}
          activeOpacity={0.8}
        >
          <Text style={[styles.modeBtnText, mode === 'free' && styles.modeBtnTextActive]}>
            ∞ Free · all
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catRow}>
        {ALL_CATEGORIES.map((cat) => {
          const c = QUESTION_CATEGORY_CONFIG[cat];
          const active = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catBtn, active && { backgroundColor: c.color, borderColor: Colors.border }]}
              onPress={() => { setCategory(cat); setIndex(0); setFlipped(false); }}
              activeOpacity={0.8}
            >
              <Text style={styles.catEmoji}>{c.emoji}</Text>
              <Text style={[styles.catLabel, active && { color: Colors.text, fontFamily: Fonts.bodyBold }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Daily mode ──────────────────────────────────────────────────── */}
      {mode === 'daily' ? (
        <ScrollView contentContainerStyle={styles.dailyContent}>
          {/* Progress */}
          <View style={[styles.dailyProgress, { borderLeftColor: dailyCfg.color }]}>
            <Text style={styles.dailyProgressText}>
              {discussedCount}/3 discussed today · {dailyCfg.emoji} {dailyCfg.label}
            </Text>
          </View>

          {dailyCatItems.map(({ q, gi }) => {
            const mine = iDiscussed(gi);
            const theirs = partnerDiscussed(gi);
            const both = allDiscussed(gi);
            return (
              <View key={gi} style={[styles.dailyCard, { backgroundColor: both ? '#F1F8E9' : dailyCfg.color }, both && styles.dailyCardDone]}>
                <Text style={styles.dailyQuestion}>{q.text}</Text>

                {both ? (
                  <View style={styles.bothBadge}>
                    <Text style={styles.bothBadgeText}>✓ Both discussed</Text>
                  </View>
                ) : (
                  <View style={styles.discussedRow}>
                    <TouchableOpacity
                      style={[styles.discussBtn, mine && styles.discussBtnDone]}
                      onPress={() => handleMarkDiscussed(gi)}
                      disabled={mine}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.discussBtnText, mine && styles.discussBtnTextDone]}>
                        {mine ? '✓ You discussed' : '✓ We discussed this'}
                      </Text>
                    </TouchableOpacity>
                    {theirs && !mine && (
                      <Text style={styles.partnerDiscussed}>
                        {partner?.name ?? 'Partner'} ✓
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {dailyCatItems.length === 0 && (
            <Text style={styles.loadingText}>Loading today's questions…</Text>
          )}
        </ScrollView>
      ) : (
        /* ── Free mode ────────────────────────────────────────────────── */
        <View style={styles.content}>
          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((index % freeFiltered.length) / freeFiltered.length) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{(index % freeFiltered.length) + 1} / {freeFiltered.length}</Text>
          </View>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: flipped ? Colors.white : freeCfg.color }]}
            onPress={flip}
            activeOpacity={0.92}
          >
            {!flipped ? (
              <View style={styles.cardFront}>
                <Text style={styles.cardEmoji}>{freeCfg.emoji}</Text>
                <Text style={styles.cardCategory}>{freeCfg.label}</Text>
                <Text style={styles.cardQuestion}>{freeCurrent.text}</Text>
                <View style={styles.hintPill}>
                  <Text style={styles.cardHint}>Tap to discuss</Text>
                </View>
              </View>
            ) : (
              <View style={styles.cardFront}>
                <Text style={styles.cardEmoji}>💬</Text>
                <Text style={styles.cardCategory}>Answer time!</Text>
                <Text style={styles.cardQuestion}>{freeCurrent.text}</Text>
                <View style={styles.hintPill}>
                  <Text style={styles.cardHint}>Each of you answer — then share</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextBtnText}>Next question →</Text>
          </TouchableOpacity>
        </View>
      )}
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

  modeRow: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginVertical: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: Colors.burgundy },
  modeBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  modeBtnTextActive: { color: Colors.cream },

  catScroll: { maxHeight: 64, flexGrow: 0 },
  catRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center' },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: Spacing.md,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  catEmoji: { fontSize: 16 },
  catLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  // Daily mode
  dailyContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.sm, gap: Spacing.md },
  dailyProgress: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4,
  },
  dailyProgressText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  dailyCard: {
    borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  dailyCardDone: { borderColor: Colors.success },
  dailyQuestion: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, lineHeight: 30 },
  bothBadge: { backgroundColor: '#E8F5E9', borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  bothBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.success },
  discussedRow: { gap: Spacing.xs },
  discussBtn: {
    paddingVertical: 10, paddingHorizontal: Spacing.lg, borderRadius: Radius.full,
    backgroundColor: Colors.burgundy, alignSelf: 'flex-start',
  },
  discussBtnDone: { backgroundColor: 'rgba(76,175,80,0.15)' },
  discussBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.cream },
  discussBtnTextDone: { color: Colors.success },
  partnerDiscussed: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },
  loadingText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', marginTop: Spacing.xl },

  // Free mode
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  progressWrap: { width: '100%', gap: 6 },
  progressBar: { height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.burgundy, borderRadius: 3 },
  progressText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, textAlign: 'right' },
  card: {
    width: '100%', minHeight: 300, borderRadius: Radius.xl, padding: Spacing.xl,
    justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.burgundy, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14, shadowRadius: 16, elevation: 8,
  },
  cardFront: { alignItems: 'center', gap: Spacing.md },
  cardEmoji: { fontSize: 48 },
  cardCategory: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  cardQuestion: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text, textAlign: 'center', lineHeight: 32 },
  hintPill: { marginTop: Spacing.sm, paddingVertical: 6, paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: 'rgba(136,14,79,0.08)' },
  cardHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.burgundy },
  nextBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderRadius: Radius.full },
  nextBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },
});
