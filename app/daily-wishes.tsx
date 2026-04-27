import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { DailyWishDoc, DailyVote, subscribeDailyWishes, voteDailyWish, isMatch } from '../services/dailyWishService';
import { DAILY_WISH_CATEGORY_CONFIG } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

export default function DailyWishesScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [dailyDoc, setDailyDoc] = useState<DailyWishDoc | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleVote = async (index: number, vote: DailyVote) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await voteDailyWish(coupleId, uid, index, vote);
  };

  const myVote = (index: number): DailyVote | null =>
    dailyDoc?.votes[uid]?.[index] ?? null;

  const partnerVoted = (index: number): boolean =>
    !!partnerId && dailyDoc?.votes[partnerId]?.[index] !== undefined;

  const matched = (index: number): boolean =>
    !!partnerId && !!dailyDoc && isMatch(dailyDoc, index, uid, partnerId);

  const votedCount = dailyDoc?.items.filter((_, i) => myVote(i) !== null).length ?? 0;
  const matchCount = dailyDoc?.items.filter((_, i) => matched(i)).length ?? 0;

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={styles.progressNum}>{votedCount}/5</Text>
              <Text style={styles.progressLabel}>You voted</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={styles.progressNum}>{matchCount}</Text>
              <Text style={styles.progressLabel}>Matches 🌹</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={styles.progressNum}>5</Text>
              <Text style={styles.progressLabel}>New tomorrow</Text>
            </View>
          </View>
          <Text style={styles.progressHint}>
            Both say Yes → it's a match. Your votes are always private.
          </Text>
        </View>

        {/* Today's 5 wishes */}
        {dailyDoc.items.map((item, index) => {
          const cfg = DAILY_WISH_CATEGORY_CONFIG[item.category];
          const vote = myVote(index);
          const didMatch = matched(index);
          const theyVoted = partnerVoted(index);

          return (
            <View key={index} style={[styles.wishCard, didMatch && styles.wishCardMatched]}>
              {/* Category badge */}
              <View style={[styles.catBadge, { backgroundColor: cfg.color }]}>
                <Text style={styles.catEmoji}>{cfg.emoji}</Text>
                <Text style={[styles.catLabel, { color: cfg.textColor }]}>{cfg.label}</Text>
              </View>

              <Text style={styles.wishText}>{item.text}</Text>

              {/* Match banner */}
              {didMatch && (
                <View style={styles.matchBanner}>
                  <Text style={styles.matchText}>✓ You both want this!</Text>
                </View>
              )}

              {/* Partner indicator */}
              {!didMatch && theyVoted && (
                <Text style={styles.partnerVotedHint}>{partner?.name ?? 'Partner'} has voted ✓</Text>
              )}

              {/* Vote buttons */}
              {!didMatch && (
                <View style={styles.voteRow}>
                  <TouchableOpacity
                    style={[styles.voteBtn, styles.voteBtnYes, vote === 'yes' && styles.voteBtnYesActive]}
                    onPress={() => handleVote(index, 'yes')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.voteBtnText, vote === 'yes' && styles.voteBtnTextActive]}>✓ Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.voteBtn, styles.voteBtnNo, vote === 'no' && styles.voteBtnNoActive]}
                    onPress={() => handleVote(index, 'no')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.voteBtnText, vote === 'no' && styles.voteBtnTextActive]}>✗ Not for me</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.refreshHint}>New 5 wishes appear every day ✨</Text>
      </ScrollView>
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

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.md },

  progressCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressItem: { flex: 1, alignItems: 'center', gap: 2 },
  progressNum: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  progressLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  progressDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  progressHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  wishCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  wishCardMatched: { borderColor: Colors.rose, backgroundColor: '#FFF8FB' },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full },
  catEmoji: { fontSize: 16 },
  catLabel: { fontFamily: Fonts.bodyBold, fontSize: 12 },
  wishText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.text, lineHeight: 24 },

  matchBanner: { backgroundColor: '#E8F5E9', borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  matchText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.success },
  partnerVotedHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },

  voteRow: { flexDirection: 'row', gap: Spacing.sm },
  voteBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  voteBtnYes: { },
  voteBtnNo: { },
  voteBtnYesActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  voteBtnNoActive: { backgroundColor: Colors.muted, borderColor: Colors.muted },
  voteBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
  voteBtnTextActive: { color: Colors.white },

  refreshHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: Spacing.sm },
});
