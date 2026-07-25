import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, Animated } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { notifyPartner } from '../services/notificationService';
import { addTodo } from '../services/todoService';
import { FantasyWishesItem, FWVote, subscribeFantasyWishes, addFantasyWishesItem, voteOnFantasyWish, isFWMatch, clearAndReloadFantasyWishes, markFWAddToListAtomic, fwBothWantToAdd } from '../services/fantasyWishesService';
import { FANTASY_WISHES_PRESETS } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

export default function FantasyWishesScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [items, setItems] = useState<FantasyWishesItem[]>([]);
  const [activeTab, setActiveTab] = useState<'explore' | 'matches'>('explore');
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [shownUnvotedIds, setShownUnvotedIds] = useState<string[]>([]);
  const [addedToList, setAddedToList] = useState<Set<string>>(new Set());
  // Match celebration + generic toast state. newMatchId names the wish card
  // to render in glow-highlight mode for ~2s after a fresh mutual Yes.
  // toastMsg / toastAnim drive a small floating banner (~3s) used for both
  // "match saved" confirmation and "wish added to next batch" from +Add.
  const [newMatchId, setNewMatchId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastActive, setToastActive] = useState(false);
  // Whether the current toast should jump to the Matches tab on tap. Set
  // per-show instead of parsing the message string so copy tweaks don't
  // silently break the interaction.
  const [toastTappable, setToastTappable] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  // Track which items were already matched at last render so we only
  // celebrate NEW mutual Yes events, not historical ones on mount.
  const prevMatchIdsRef = useRef<Set<string> | null>(null);
  const help = useHelp('fantasy-wishes');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeFantasyWishes(coupleId, setItems);
  }, [coupleId]);

  // Small floating banner top of screen. Same helper for match reveal and
  // +Add confirmation. Match variant is tappable (jumps to Matches tab);
  // +Add variant is passive info. Auto-dismisses after 3s.
  const showToast = (msg: string, tappable: boolean = false) => {
    setToastMsg(msg);
    setToastTappable(tappable);
    setToastActive(true);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(() => {
      setToastActive(false);
      setToastMsg(null);
      setToastTappable(false);
    });
  };

  // Detect fresh mutual Yes matches. On first snapshot we snapshot existing
  // matches into the ref without celebrating (those are historical). Any
  // new match id that appears after that fires a celebration — either from
  // my own Yes landing on partner's Yes, or from partner's Yes landing on
  // mine while I'm looking at the screen.
  useEffect(() => {
    if (!partnerId || items.length === 0) return;
    const currentMatchIds = new Set(
      items.filter((i) => isFWMatch(i, uid, partnerId)).map((i) => i.id),
    );
    if (prevMatchIdsRef.current === null) {
      prevMatchIdsRef.current = currentMatchIds;
      return;
    }
    const freshMatchIds = [...currentMatchIds].filter((id) => !prevMatchIdsRef.current!.has(id));
    if (freshMatchIds.length > 0) {
      const matchedItem = items.find((i) => i.id === freshMatchIds[0]);
      if (matchedItem) {
        setNewMatchId(matchedItem.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast("It's a Match! ✨ Tap to see", true);
        // Clear the glow highlight after the animation window so the card
        // returns to its normal appearance in Explore / Matches list.
        setTimeout(() => setNewMatchId(null), 2200);
      }
    }
    prevMatchIdsRef.current = currentMatchIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, partnerId, uid]);

  // Initialize locked batch of 5 unvoted items when items first load
  useEffect(() => {
    if (shownUnvotedIds.length === 0 && items.length > 0 && uid) {
      const first5 = items
        .filter(i => !i.votes[uid])
        .slice(0, 5)
        .map(i => i.id);
      setShownUnvotedIds(first5);
    }
  }, [items.length, uid]);

  const handleVote = async (item: FantasyWishesItem, vote: FWVote) => {
    if (!coupleId || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await voteOnFantasyWish(coupleId, item.id, uid, vote);
    if (vote === 'yes' && partnerId) {
      const updated = { ...item, votes: { ...item.votes, [uid]: 'yes' as const } };
      if (isFWMatch(updated, uid, partnerId)) {
        notifyPartner(coupleId, uid, 'New match ✨', 'You have a shared fantasy wish').catch(() => {});
      }
    }
  };

  const handleAdd = async () => {
    if (!newText.trim() || !coupleId) return;
    const newId = await addFantasyWishesItem(coupleId, newText.trim());
    // Inject the new wish into the current locked batch immediately so the
    // user sees it right below the existing 5, not somewhere down after
    // Load 5 more. Previously the toast said "You'll see it after this
    // batch" but Load 5 more's .slice(0, 5) picks the oldest unvoted items
    // by createdAt, so the just-added (newest) wish never surfaced until
    // hundreds of presets had been voted on.
    setShownUnvotedIds((prev) => [...prev, newId]);
    setNewText('');
    setShowAdd(false);
    showToast('Added ✓ · Just below', false);
  };

  const loadPresets = async () => {
    const id = profile?.coupleId;
    if (!id || loadingPresets) return;
    setLoadingPresets(true);
    try {
      await Promise.all(FANTASY_WISHES_PRESETS.map((p) => addFantasyWishesItem(id, p.text)));
    } finally {
      setLoadingPresets(false);
    }
  };

  const handleReset = async () => {
    const id = profile?.coupleId;
    if (!id || resetting) return;
    setResetting(true);
    try {
      await clearAndReloadFantasyWishes(id, FANTASY_WISHES_PRESETS);
      setShownUnvotedIds([]); // will re-init from fresh items
    } finally {
      setResetting(false);
    }
  };

  const handleAddToTogether = async (item: FantasyWishesItem) => {
    if (!coupleId || !user) return;
    if ((item.addToList ?? []).includes(uid)) return; // fast-path idempotency
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Atomic: reads addToList + writes + reports completedNow inside a
    // single transaction. Prevents the race where both partners press within
    // the same tick, each sees a stale snapshot without the other's uid, and
    // neither branch creates the todo.
    const { completedNow } = await markFWAddToListAtomic(coupleId, uid, partnerId, item.id);
    if (completedNow) {
      await addTodo(coupleId, item.text, 'intimacy', uid, 'fantasy-wishes');
    }
  };

  const myVote = (item: FantasyWishesItem): FWVote | null =>
    item.votes[uid] as FWVote ?? null;

  const matched = items.filter((i) => partnerId && isFWMatch(i, uid, partnerId));
  const allVoted = items.filter((i) => myVote(i) !== null);
  // Locked batch: items in shownUnvotedIds that are still unvoted
  const currentBatch = items.filter((i) => shownUnvotedIds.includes(i.id) && myVote(i) === null);
  const canLoadMore = currentBatch.length === 0 && allVoted.length < items.length;

  const loadMore = () => {
    const alreadyShown = new Set(shownUnvotedIds);
    const votedIds = new Set(allVoted.map(i => i.id));
    const next5 = items
      .filter(i => !votedIds.has(i.id) && !alreadyShown.has(i.id))
      .slice(0, 5)
      .map(i => i.id);
    setShownUnvotedIds(prev => [...prev, ...next5]);
  };

  // Build heterogeneous row data for FlatList — switches based on active tab
  type Row =
    | { type: 'empty-explore' }
    | { type: 'wish-current'; item: FantasyWishesItem }
    | { type: 'load-more' }
    | { type: 'all-done' }
    | { type: 'voted-label' }
    | { type: 'wish-voted'; item: FantasyWishesItem }
    | { type: 'empty-matches' }
    | { type: 'match-card'; item: FantasyWishesItem };

  const rows = useMemo<Row[]>(() => {
    if (activeTab === 'matches') {
      if (matched.length === 0) return [{ type: 'empty-matches' }];
      return matched.map(item => ({ type: 'match-card' as const, item }));
    }
    // Explore tab
    const list: Row[] = [];
    if (items.length === 0) list.push({ type: 'empty-explore' });
    for (const item of currentBatch) list.push({ type: 'wish-current', item });
    if (canLoadMore) list.push({ type: 'load-more' });
    if (!canLoadMore && currentBatch.length === 0 && allVoted.length === items.length && items.length > 0) {
      list.push({ type: 'all-done' });
    }
    if (allVoted.length > 0) {
      list.push({ type: 'voted-label' });
      for (const item of allVoted) list.push({ type: 'wish-voted', item });
    }
    return list;
  }, [activeTab, matched, items.length, currentBatch, allVoted, canLoadMore]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Fantasy Wishes</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          {items.length > 0 && (
            <TouchableOpacity onPress={handleReset} disabled={resetting} accessibilityRole="button" accessibilityLabel="Reset wishes" accessibilityHint="Cannot be undone">
              <Text style={styles.resetBtn}>{resetting ? '…' : '↺'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowAdd(true)} accessibilityRole="button" accessibilityLabel="Add wish">
            <Text style={styles.addBtn}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>✨ Vote privately, only mutual Yes matches are ever revealed</Text>
      </View>

      {/* Floating toast — fires on new match ("It's a Match! ✨ Tap to see",
          tappable → Matches tab) and on +Add ("Added ✓ · Just below",
          passive). Absolute positioned so it hovers over the list content
          without shifting it. */}
      {toastActive && toastMsg && (
        <Animated.View
          style={[
            styles.toast,
            toastTappable && styles.toastMatch,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            onPress={() => { if (toastTappable) setActiveTab('matches'); }}
            activeOpacity={toastTappable ? 0.85 : 1}
            disabled={!toastTappable}
            accessibilityRole={toastTappable ? 'button' : 'text'}
            accessibilityLabel={toastMsg}
          >
            <Text style={[styles.toastText, toastTappable && styles.toastTextMatch]}>{toastMsg}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'explore' && styles.tabActive]} onPress={() => setActiveTab('explore')} accessibilityRole="button">
          <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'matches' && styles.tabActive]} onPress={() => setActiveTab('matches')} accessibilityRole="button">
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>✓ Matches ({matched.length})</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row, idx) => row.type === 'wish-current' || row.type === 'wish-voted' || row.type === 'match-card' ? `${row.type}-${row.item.id}` : `${row.type}-${idx}`}
        contentContainerStyle={styles.list}
        renderItem={({ item: row }) => {
          switch (row.type) {
            case 'empty-explore':
              return (
                <TouchableOpacity style={styles.emptyCard} onPress={loadPresets} disabled={loadingPresets} activeOpacity={0.7} accessibilityRole="button">
                  <Text style={styles.emptyEmoji}>{loadingPresets ? '⏳' : '✨'}</Text>
                  <Text style={styles.emptyTitle}>{loadingPresets ? 'Loading…' : 'Explore together'}</Text>
                  <Text style={styles.emptyText}>
                    {loadingPresets
                      ? 'Adding 120 wishes, this takes a moment'
                      : 'Tap to load explicit sexual scenarios. Only mutual Yes is ever revealed.'}
                  </Text>
                </TouchableOpacity>
              );
            case 'wish-current':
              return <WishCard item={row.item} onVote={handleVote} myVote={null} isCelebrating={row.item.id === newMatchId} />;
            case 'load-more':
              return (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} activeOpacity={0.8} accessibilityRole="button">
                  <Text style={styles.loadMoreText}>Load 5 more ↓</Text>
                </TouchableOpacity>
              );
            case 'all-done':
              return (
                <View style={styles.allDoneCard}>
                  <Text style={styles.allDoneEmoji}>✨</Text>
                  <Text style={styles.allDoneText}>You've voted on everything!</Text>
                </View>
              );
            case 'voted-label':
              return <Text style={styles.groupLabel}>Already voted</Text>;
            case 'wish-voted':
              return <WishCard item={row.item} onVote={handleVote} myVote={myVote(row.item)} isCelebrating={row.item.id === newMatchId} />;
            case 'empty-matches':
              return (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>💫</Text>
                  <Text style={styles.emptyTitle}>No matches yet</Text>
                  <Text style={styles.emptyText}>When you both say Yes to something, it appears here</Text>
                </View>
              );
            case 'match-card': {
              const item = row.item;
              const iPressed = (item.addToList ?? []).includes(uid);
              const theyPressed = !!partnerId && (item.addToList ?? []).includes(partnerId);
              const bothPressed = fwBothWantToAdd(item, uid, partnerId ?? '');
              const celebrating = item.id === newMatchId;
              return (
                <View style={[styles.matchCard, celebrating && styles.matchCardCelebrating]}>
                  <Text style={styles.matchEmoji}>✨</Text>
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchText}>{item.text}</Text>
                    <Text style={styles.matchBadge}>✓ You both want this</Text>
                    {bothPressed ? (
                      <Text style={styles.addedText}>✓ Added to Together List</Text>
                    ) : iPressed ? (
                      <Text style={styles.waitingText}>Waiting for {partner?.name ?? 'partner'} ✓</Text>
                    ) : (
                      <TouchableOpacity style={styles.addToListBtn} onPress={() => handleAddToTogether(item)} activeOpacity={0.8} accessibilityRole="button">
                        <Text style={styles.addToListBtnText}>
                          {theyPressed ? `${partner?.name ?? 'Partner'} wants to add, tap to confirm` : '+ Add to Together List'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }
            default: return null;
          }
        }}
        removeClippedSubviews
        initialNumToRender={8}
        windowSize={5}
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add a wish</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe something you'd love to try…"
              placeholderTextColor={Colors.muted}
              value={newText}
              onChangeText={setNewText}
              multiline
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} accessibilityRole="button">
                <Text style={styles.saveBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Fantasy Wishes"
        description="A private list of explicit sexual scenarios. Vote independently, only mutual Yes is ever revealed to both of you."
        tips={[
          'Tap to load preset scenarios, or add your own',
          'Vote Yes, Maybe, or No, your partner never sees your choices',
          'When you both say Yes → it appears in Matches',
          'Tap matches to add them to your Together List',
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </View>
  );
}

function WishCard({ item, onVote, myVote, isCelebrating }: {
  item: FantasyWishesItem;
  onVote: (item: FantasyWishesItem, vote: FWVote) => void;
  myVote: FWVote | null;
  isCelebrating?: boolean;
}) {
  return (
    <View style={[styles.wishCard, isCelebrating && styles.wishCardCelebrating]}>
      {isCelebrating && (
        <View style={styles.celebrateBadge}>
          <Text style={styles.celebrateBadgeText}>It's a Match! ✨</Text>
        </View>
      )}
      <Text style={styles.wishText}>{item.text}</Text>
      <View style={styles.voteRow}>
        {(['yes', 'maybe', 'no'] as FWVote[]).map((v) => {
          const labels = { yes: '✓ Yes', maybe: '~ Maybe', no: '✗ No' };
          const colors = { yes: Colors.success, maybe: '#F9A825', no: Colors.error };
          const active = myVote === v;
          return (
            <TouchableOpacity
              key={v}
              style={[styles.voteBtn, active && { backgroundColor: colors[v], borderColor: colors[v] }]}
              onPress={() => onVote(item, v)}
              activeOpacity={0.8}
             accessibilityRole="button">
              <Text style={[styles.voteBtnText, active && { color: Colors.white }]}>{labels[v]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  addBtn: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },
  resetBtn: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.muted },
  loadMoreBtn: { paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.burgundy, backgroundColor: Colors.white, marginTop: Spacing.sm },
  loadMoreText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
  allDoneCard: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  allDoneEmoji: { fontSize: 36 },
  allDoneText: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted },
  infoBanner: { marginHorizontal: Spacing.lg, marginTop: Spacing.sm, backgroundColor: '#F3E5F5', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  infoText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: '#6A1B9A', textAlign: 'center' },
  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.burgundy },
  tabText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  tabTextActive: { color: Colors.cream },
  scroll: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  groupLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  emptyCard: { alignItems: 'center', padding: Spacing.xxl, backgroundColor: Colors.white, borderRadius: Radius.xl, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  wishCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  // Highlight state for ~2s right after a fresh mutual Yes. Warm blush
  // background + burgundy border pulls the eye without being loud.
  wishCardCelebrating: { backgroundColor: '#FCE4EC', borderColor: Colors.burgundy, borderWidth: 2 },
  celebrateBadge: { alignSelf: 'flex-start', backgroundColor: Colors.burgundy, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 2 },
  celebrateBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.cream, letterSpacing: 0.5 },
  wishText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  voteRow: { flexDirection: 'row', gap: Spacing.sm },
  voteBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  voteBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  matchCard: { borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: '#F3E5F5' },
  matchCardCelebrating: { borderColor: Colors.burgundy, borderWidth: 2, backgroundColor: '#FCE4EC' },
  // Floating toast — sits below the info banner, above the list. High
  // zIndex so it hovers above cards. Warm burgundy text on cream + border.
  toast: {
    position: 'absolute',
    top: 168,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.cream,
    borderColor: Colors.burgundy,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    zIndex: 50,
    elevation: 8,
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  toastText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, letterSpacing: 0.3 },
  // Match variant of the floating toast: inverted colors so it reads as
  // celebratory instead of informational. Burgundy fill + cream text lands
  // heavier than the default cream fill + burgundy text used by +Add.
  toastMatch: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  toastTextMatch: { color: Colors.cream, fontSize: 14, letterSpacing: 0.4 },
  matchEmoji: { fontSize: 28, marginTop: 2 },
  matchInfo: { flex: 1, gap: 4 },
  matchText: { fontFamily: Fonts.heading, fontSize: 17, color: Colors.text, lineHeight: 24 },
  matchBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.success },
  addToListBtn: { marginTop: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  addToListBtnText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.cream },
  addedText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.success, marginTop: 4 },
  waitingText: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalInput: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.border },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
