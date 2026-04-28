import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { notifyPartner } from '../services/notificationService';
import { addTodo } from '../services/todoService';
import { FantasyWishesItem, FWVote, subscribeFantasyWishes, addFantasyWishesItem, voteOnFantasyWish, isFWMatch, clearAndReloadFantasyWishes } from '../services/fantasyWishesService';
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
  const [visibleCount, setVisibleCount] = useState(10);
  const [addedToList, setAddedToList] = useState<Set<string>>(new Set());
  const help = useHelp('fantasy-wishes');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeFantasyWishes(coupleId, setItems);
  }, [coupleId]);

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
    await addFantasyWishesItem(coupleId, newText.trim());
    setNewText('');
    setShowAdd(false);
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
    } finally {
      setResetting(false);
    }
  };

  const handleAddToTogether = async (item: FantasyWishesItem) => {
    if (!coupleId || !user || addedToList.has(item.id)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addTodo(coupleId, item.text, 'dates', uid);
    setAddedToList((prev) => new Set(prev).add(item.id));
  };

  const myVote = (item: FantasyWishesItem): FWVote | null =>
    item.votes[uid] as FWVote ?? null;

  const matched = items.filter((i) => partnerId && isFWMatch(i, uid, partnerId));
  const unvoted = items.filter((i) => !myVote(i));
  const voted = items.filter((i) => myVote(i));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Fantasy Wishes</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          {items.length > 0 && (
            <TouchableOpacity onPress={handleReset} disabled={resetting}>
              <Text style={styles.resetBtn}>{resetting ? '…' : '↺'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtn}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>✨ Vote privately — only mutual Yes matches are ever revealed</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'explore' && styles.tabActive]} onPress={() => setActiveTab('explore')}>
          <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>Explore ({items.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'matches' && styles.tabActive]} onPress={() => setActiveTab('matches')}>
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>✓ Matches ({matched.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        {activeTab === 'explore' ? (
          <>
            {items.length === 0 && (
              <TouchableOpacity style={styles.emptyCard} onPress={loadPresets} disabled={loadingPresets} activeOpacity={0.7}>
                <Text style={styles.emptyEmoji}>{loadingPresets ? '⏳' : '✨'}</Text>
                <Text style={styles.emptyTitle}>{loadingPresets ? 'Loading…' : 'Explore together'}</Text>
                <Text style={styles.emptyText}>
                  {loadingPresets
                    ? 'Adding 120 wishes — this takes a moment'
                    : 'Tap to load explicit sexual scenarios. Only mutual Yes is ever revealed.'}
                </Text>
              </TouchableOpacity>
            )}
            {unvoted.length > 0 && <Text style={styles.groupLabel}>To vote on ({unvoted.length} remaining)</Text>}
            {unvoted.slice(0, visibleCount).map((item) => (
              <WishCard key={item.id} item={item} onVote={(i, v) => { handleVote(i, v); }} myVote={null} />
            ))}
            {unvoted.length > visibleCount && (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setVisibleCount((c) => c + 5)} activeOpacity={0.8}>
                <Text style={styles.loadMoreText}>Load 5 more ({unvoted.length - visibleCount} left) ↓</Text>
              </TouchableOpacity>
            )}
            {voted.length > 0 && <Text style={styles.groupLabel}>Already voted</Text>}
            {voted.map((item) => <WishCard key={item.id} item={item} onVote={handleVote} myVote={myVote(item)} />)}
          </>
        ) : (
          <>
            {matched.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>💫</Text>
                <Text style={styles.emptyTitle}>No matches yet</Text>
                <Text style={styles.emptyText}>When you both say Yes to something, it appears here</Text>
              </View>
            ) : (
              matched.map((item) => {
                const added = addedToList.has(item.id);
                return (
                  <View key={item.id} style={styles.matchCard}>
                    <Text style={styles.matchEmoji}>✨</Text>
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchText}>{item.text}</Text>
                      <Text style={styles.matchBadge}>✓ You both want this</Text>
                      <TouchableOpacity
                        style={[styles.addToListBtn, added && styles.addToListBtnDone]}
                        onPress={() => handleAddToTogether(item)}
                        disabled={added}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.addToListBtnText}>
                          {added ? '✓ Added to Together List' : '+ Add to Together List'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

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
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Fantasy Wishes"
        description="A private list of explicit sexual scenarios. Vote independently — only mutual Yes is ever revealed to both of you."
        tips={[
          'Tap to load preset scenarios, or add your own',
          'Vote Yes, Maybe, or No — your partner never sees your choices',
          'When you both say Yes → it appears in Matches',
          'Tap matches to add them to your Together List',
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </View>
  );
}

function WishCard({ item, onVote, myVote }: {
  item: FantasyWishesItem;
  onVote: (item: FantasyWishesItem, vote: FWVote) => void;
  myVote: FWVote | null;
}) {
  return (
    <View style={styles.wishCard}>
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
            >
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
  loadMoreBtn: { paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  loadMoreText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
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
  wishText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  voteRow: { flexDirection: 'row', gap: Spacing.sm },
  voteBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  voteBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  matchCard: { borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: '#F3E5F5' },
  matchEmoji: { fontSize: 28, marginTop: 2 },
  matchInfo: { flex: 1, gap: 4 },
  matchText: { fontFamily: Fonts.heading, fontSize: 17, color: Colors.text, lineHeight: 24 },
  matchBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.success },
  addToListBtn: { marginTop: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: 'rgba(0,0,0,0.08)' },
  addToListBtnDone: { backgroundColor: 'rgba(76,175,80,0.15)' },
  addToListBtnText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.text },
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
