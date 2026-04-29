import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import {
  DailyWishDoc, DailyVote,
  subscribeDailyWishes, voteDailyWish, isMatch, markAddToList, bothWantToAdd,
} from '../services/dailyWishService';
import { addTodo } from '../services/todoService';
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
  const [showMatches, setShowMatches] = useState(false);
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

  const handleAddToList = async (globalIndex: number) => {
    if (!coupleId || !dailyDoc) return;
    const alreadyPressed = (dailyDoc.addToList?.[globalIndex] ?? []).includes(uid);
    if (alreadyPressed) return;
    const partnerAlreadyPressed = !!partnerId && (dailyDoc.addToList?.[globalIndex] ?? []).includes(partnerId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markAddToList(coupleId, uid, globalIndex);
    // Only add todo if partner already pressed (we're second → add once)
    if (partnerAlreadyPressed) {
      await addTodo(coupleId, dailyDoc.items[globalIndex].text, 'fantasy', uid);
    }
  };

  const myVote = (idx: number): DailyVote | null => dailyDoc?.votes[uid]?.[idx] ?? null;
  const partnerVoted = (idx: number): boolean => !!partnerId && dailyDoc?.votes[partnerId]?.[idx] !== undefined;
  const matched = (idx: number): boolean => !!partnerId && !!dailyDoc && isMatch(dailyDoc, idx, uid, partnerId);

  const myAddedToList = (idx: number): boolean =>
    (dailyDoc?.addToList?.[idx] ?? []).includes(uid);
  const partnerAddedToList = (idx: number): boolean =>
    !!partnerId && (dailyDoc?.addToList?.[idx] ?? []).includes(partnerId);
  const bothAdded = (idx: number): boolean =>
    !!partnerId && !!dailyDoc && bothWantToAdd(dailyDoc, idx, uid, partnerId);

  const catItems = (dailyDoc?.items ?? [])
    .map((item, globalIndex) => ({ item, globalIndex }))
    .filter(({ item }) => item.category === selectedCat);

  const catVotedCount = catItems.filter(({ globalIndex: i }) => myVote(i) !== null).length;
  const catMatchCount = catItems.filter(({ globalIndex: i }) => matched(i)).length;

  // All matches across all categories (for modal)
  const allMatches = (dailyDoc?.items ?? [])
    .map((item, gi) => ({ item, gi }))
    .filter(({ gi }) => matched(gi));

  const totalMatchCount = allMatches.length;
  const cfg = DAILY_WISH_CATEGORY_CONFIG[selectedCat];

  if (loading || !dailyDoc) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Daily Picks</Text>
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
        <Text style={styles.title}>Daily Picks</Text>
        <View style={{ width: 60 }} />
      </View>

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

        {/* Progress */}
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
            <TouchableOpacity style={styles.progressItem} onPress={() => totalMatchCount > 0 && setShowMatches(true)} activeOpacity={totalMatchCount > 0 ? 0.7 : 1}>
              <Text style={[styles.progressNum, { color: totalMatchCount > 0 ? Colors.burgundy : Colors.muted }]}>{totalMatchCount}</Text>
              <Text style={[styles.progressLabel, totalMatchCount > 0 && styles.progressLabelTap]}>Total matches{totalMatchCount > 0 ? ' ›' : ''}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.progressHint}>Both say Yes → match. Votes are always private.</Text>
        </View>

        {/* Items */}
        {catItems.map(({ item, globalIndex }) => {
          const vote = myVote(globalIndex);
          const didMatch = matched(globalIndex);
          const theyVoted = partnerVoted(globalIndex);
          const iAdded = myAddedToList(globalIndex);
          const theyAdded = partnerAddedToList(globalIndex);
          const alreadyAdded = bothAdded(globalIndex) ;

          return (
            <View key={globalIndex} style={[styles.wishCard, didMatch && styles.wishCardMatched]}>
              <Text style={styles.wishText}>{item.text}</Text>

              {didMatch ? (
                <View style={styles.matchSection}>
                  <View style={styles.matchBanner}>
                    <Text style={styles.matchText}>✓ You both want this!</Text>
                  </View>

                  {alreadyAdded ? (
                    <View style={styles.addedBadge}>
                      <Text style={styles.addedText}>✓ Added to Together List</Text>
                    </View>
                  ) : iAdded ? (
                    <Text style={styles.waitingText}>
                      Waiting for {partner?.name ?? 'partner'} to add ✓
                    </Text>
                  ) : (
                    <TouchableOpacity style={styles.addBtn} onPress={() => handleAddToList(globalIndex)} activeOpacity={0.8}>
                      <Text style={styles.addBtnText}>
                        {theyAdded ? `${partner?.name ?? 'Partner'} wants to add — tap to confirm` : '+ Add to Together List'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {theyVoted && (
                    <Text style={styles.partnerVotedHint}>{partner?.name ?? 'Partner'} has voted ✓</Text>
                  )}
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
                </>
              )}
            </View>
          );
        })}

        <Text style={styles.refreshHint}>New 5 picks per category every day ✨</Text>
      </ScrollView>

      {/* All Matches Modal */}
      <Modal visible={showMatches} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Matches 🌹</Text>
              <TouchableOpacity onPress={() => setShowMatches(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: Spacing.md, paddingBottom: Spacing.xl }}>
              {allMatches.length === 0 ? (
                <Text style={styles.emptyText}>No matches yet today.</Text>
              ) : (
                allMatches.map(({ item, gi }) => {
                  const iAdded = myAddedToList(gi);
                  const theyAdded = partnerAddedToList(gi);
                  const alreadyAdded = bothAdded(gi) ;
                  const cat = DAILY_WISH_CATEGORY_CONFIG[item.category];
                  return (
                    <View key={gi} style={styles.matchModalCard}>
                      <View style={[styles.catBadgeSm, { backgroundColor: cat.color }]}>
                        <Text style={[styles.catBadgeSmText, { color: cat.textColor }]}>{cat.emoji} {cat.label}</Text>
                      </View>
                      <Text style={styles.matchModalText}>{item.text}</Text>
                      {alreadyAdded ? (
                        <Text style={styles.addedText}>✓ Added to Together List</Text>
                      ) : iAdded ? (
                        <Text style={styles.waitingText}>Waiting for {partner?.name ?? 'partner'} ✓</Text>
                      ) : (
                        <TouchableOpacity style={styles.addBtn} onPress={() => { handleAddToList(gi); }} activeOpacity={0.8}>
                          <Text style={styles.addBtnText}>
                            {theyAdded ? `${partner?.name ?? 'Partner'} wants to add — tap to confirm` : '+ Add to Together List'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Daily Picks"
        description="Every day you and your partner get 5 new picks per category to vote on — privately."
        tips={[
          "Tap ✓ Yes or ✗ Not for me on each pick",
          "Your partner never sees your individual votes",
          "When you both say Yes → it becomes a match",
          "Both must tap 'Add to Together List' for it to be added",
          "Tap 'Total matches' to see all your matches today",
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
    flexDirection: 'row', backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border, overflow: 'hidden',
  },
  catTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 3 },
  catTabEmoji: { fontSize: 18 },
  catTabLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.md },

  progressCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, ...Shadow.sm,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressItem: { flex: 1, alignItems: 'center', gap: 2 },
  progressNum: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  progressLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  progressLabelTap: { color: Colors.burgundy, fontFamily: Fonts.bodyBold },
  progressDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  progressHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },

  wishCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  wishCardMatched: { borderColor: Colors.rose, backgroundColor: '#FFF8FB' },
  wishText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.text, lineHeight: 24 },

  matchSection: { gap: Spacing.sm },
  matchBanner: { backgroundColor: '#E8F5E9', borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  matchText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.success },

  addBtn: { paddingVertical: 10, paddingHorizontal: Spacing.lg, borderRadius: Radius.full, backgroundColor: Colors.burgundy, alignItems: 'center' },
  addBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.cream },
  waitingText: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },
  addedBadge: { backgroundColor: '#E8F5E9', borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  addedText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.success },

  partnerVotedHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },

  voteRow: { flexDirection: 'row', gap: Spacing.sm },
  voteBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  voteBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
  voteBtnTextActive: { color: Colors.white },

  refreshHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: Spacing.sm },

  // Matches modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(61,26,36,0.55)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalClose: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.muted, padding: Spacing.xs },
  matchModalCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  catBadgeSm: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.full },
  catBadgeSmText: { fontFamily: Fonts.bodyBold, fontSize: 11 },
  matchModalText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', paddingVertical: Spacing.xl },
});
