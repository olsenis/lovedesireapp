import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { DailyWishDoc, DailyVote, subscribeDailyWishes, voteDailyWish, isMatch } from '../services/dailyWishService';
import { DAILY_WISH_CATEGORY_CONFIG, DailyWishCategory } from '../constants/content';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const CATEGORIES: DailyWishCategory[] = ['sweet', 'flirty', 'spicy', 'sexual'];

export default function DailyWishesScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [dailyDoc, setDailyDoc] = useState<DailyWishDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<DailyWishCategory>('sweet');
  const scrollRef = useRef<ScrollView>(null);
  const help = useHelp('daily-wishes');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId) return;
    const unsub = subscribeDailyWishes(coupleId, (doc) => {
      setDailyDoc(doc);
      setLoading(false);
    });
    return unsub;
  }, [coupleId]);

  const handleVote = async (globalIndex: number, vote: DailyVote) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await voteDailyWish(coupleId, uid, globalIndex, vote);
  };

  const myVote = (idx: number): DailyVote | null => dailyDoc?.votes[uid]?.[idx] ?? null;
  const partnerVoted = (idx: number): boolean => !!partnerId && dailyDoc?.votes[partnerId]?.[idx] !== undefined;
  const matched = (idx: number): boolean => !!partnerId && !!dailyDoc && isMatch(dailyDoc, idx, uid, partnerId);

  // Items for the selected category with their global index
  const catItems = (dailyDoc?.items ?? [])
    .map((item, globalIndex) => ({ item, globalIndex }))
    .filter(({ item }) => item.category === selectedCat);

  const catVotedCount = catItems.filter(({ globalIndex: i }) => myVote(i) !== null).length;
  const catMatchCount = catItems.filter(({ globalIndex: i }) => matched(i)).length;
  const totalMatchCount = (dailyDoc?.items ?? []).reduce((n, _, i) => n + (matched(i) ? 1 : 0), 0);

  const cfg = DAILY_WISH_CATEGORY_CONFIG[selectedCat];

  if (loading || !dailyDoc) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Daily Wishes</Text>
          <View style={{ width: 60 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Daily Wishes</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Category selector — same pattern as Dare Wheel */}
      <View style={styles.catSegment}>
        {CATEGORIES.map((cat) => {
          const c = DAILY_WISH_CATEGORY_CONFIG[cat];
          const active = selectedCat === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catTab, active && { backgroundColor: c.color }]}
              onPress={() => { setSelectedCat(cat); scrollRef.current?.scrollTo({ y: 0, animated: false }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              activeOpacity={0.8}
            >
              <Text style={styles.catTabEmoji}>{c.emoji}</Text>
              <Text style={[styles.catTabLabel, active && { color: c.textColor, fontFamily: Fonts.bodyBold }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Progress for this category */}
        <View style={[styles.progressCard, { borderLeftColor: cfg.textColor }]}>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={[styles.progressNum, { color: cfg.textColor }]}>{catVotedCount}/5</Text>
              <Text style={styles.progressLabel}>You voted</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={[styles.progressNum, { color: cfg.textColor }]}>{catMatchCount}</Text>
              <Text style={styles.progressLabel}>{cfg.emoji} Matches</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={[styles.progressNum, { color: cfg.textColor }]}>{totalMatchCount}</Text>
              <Text style={styles.progressLabel}>Total matches</Text>
            </View>
          </View>
          <Text style={styles.progressHint}>
            Both say Yes → match. Votes are always private.
          </Text>
        </View>

        {/* Items for selected category */}
        {catItems.map(({ item, globalIndex }) => {
          const vote = myVote(globalIndex);
          const didMatch = matched(globalIndex);
          const theyVoted = partnerVoted(globalIndex);

          return (
            <View key={globalIndex} style={[styles.wishCard, didMatch && styles.wishCardMatched]}>
              <Text style={styles.wishText}>{item.text}</Text>

              {didMatch && (
                <View style={styles.matchBanner}>
                  <Text style={styles.matchText}>✓ You both want this!</Text>
                </View>
              )}

              {!didMatch && theyVoted && (
                <Text style={styles.partnerVotedHint}>
                  {partner?.name ?? 'Partner'} has voted ✓
                </Text>
              )}

              {!didMatch && (
                <View style={styles.voteRow}>
                  <TouchableOpacity
                    style={[styles.voteBtn, vote === 'yes' && { backgroundColor: Colors.success, borderColor: Colors.success }]}
                    onPress={() => handleVote(globalIndex, 'yes')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.voteBtnText, vote === 'yes' && styles.voteBtnTextActive]}>✓ Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.voteBtn, vote === 'no' && { backgroundColor: Colors.muted, borderColor: Colors.muted }]}
                    onPress={() => handleVote(globalIndex, 'no')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.voteBtnText, vote === 'no' && styles.voteBtnTextActive]}>✗ Not for me</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.refreshHint}>New 5 per category every day ✨</Text>
      </ScrollView>

      <HelpModal
        visible={help.visible}
        title="Daily Wishes"
        description="Every day you and your partner each get 5 new wishes per category to vote on — privately."
        tips={[
          "Tap ✓ Yes or ✗ Not for me on each wish",
          "Your partner never sees your individual votes",
          "When you both say Yes → it becomes a match",
          "New 5 wishes appear in each category every day",
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

  catSegment: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    overflow: 'hidden',
  },
  catTab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 3,
  },
  catTabEmoji: { fontSize: 18 },
  catTabLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.md },

  progressCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4, ...Shadow.sm,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressItem: { flex: 1, alignItems: 'center', gap: 2 },
  progressNum: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  progressLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  progressDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  progressHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },

  wishCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  wishCardMatched: { borderColor: Colors.rose, backgroundColor: '#FFF8FB' },
  wishText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.text, lineHeight: 24 },

  matchBanner: { backgroundColor: '#E8F5E9', borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  matchText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.success },
  partnerVotedHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },

  voteRow: { flexDirection: 'row', gap: Spacing.sm },
  voteBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  voteBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
  voteBtnTextActive: { color: Colors.white },

  refreshHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: Spacing.sm },
});
