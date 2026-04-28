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
import {
  WishlistItem, WishCategory, WishVote,
  WISH_CATEGORY_CONFIG, subscribeWishlist, addWishlistItem, voteOnWish, isMatch,
} from '../services/wishlistService';
import { PRESET_WISHES } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

const CATEGORIES: WishCategory[] = ['romantic', 'adventure', 'intimate', 'spicy'];

export default function WishlistScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<'vote' | 'matches'>('vote');
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCat, setNewCat] = useState<WishCategory>('romantic');
  const [addedToList, setAddedToList] = useState<Set<string>>(new Set());
  const help = useHelp('wishlist');

  const coupleId = profile?.coupleId;
  const partnerId = couple?.partner1Uid === user?.uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeWishlist(coupleId, setItems);
  }, [coupleId]);

  const handleVote = async (item: WishlistItem, vote: WishVote) => {
    if (!coupleId || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await voteOnWish(coupleId, item.id, user.uid, vote);
    if (vote === 'yes' && partnerId) {
      const updated = { ...item, votes: { ...item.votes, [user.uid]: 'yes' as const } };
      if (isMatch(updated, user.uid, partnerId)) {
        notifyPartner(coupleId, user.uid, 'New match 🌹', "You both want the same thing").catch(() => {});
      }
    }
  };

  const handleAddToTogether = async (item: WishlistItem) => {
    if (!coupleId || !user || addedToList.has(item.id)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addTodo(coupleId, item.text, 'dates', user.uid);
    setAddedToList((prev) => new Set(prev).add(item.id));
  };

  const handleAdd = async () => {
    if (!newText.trim() || !coupleId) return;
    await addWishlistItem(coupleId, newText.trim(), newCat);
    setNewText('');
    setShowAdd(false);
  };

  const addPresets = async () => {
    if (!coupleId) return;
    for (const p of PRESET_WISHES) {
      await addWishlistItem(coupleId, p.text, p.category);
    }
  };

  const myVote = (item: WishlistItem): WishVote | null =>
    user ? (item.votes[user.uid] as WishVote) ?? null : null;

  const matched = items.filter((i) => user?.uid && partnerId && isMatch(i, user.uid, partnerId));
  const unvoted = items.filter((i) => !myVote(i));
  const voted = items.filter((i) => myVote(i));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Wishlist</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtn}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>🔒 Vote privately — only mutual matches are revealed</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'vote' && styles.tabActive]} onPress={() => setActiveTab('vote')}>
          <Text style={[styles.tabText, activeTab === 'vote' && styles.tabTextActive]}>Vote ({items.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'matches' && styles.tabActive]} onPress={() => setActiveTab('matches')}>
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>✓ Matches ({matched.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        {activeTab === 'vote' ? (
          <>
            {items.length === 0 && (
              <TouchableOpacity style={styles.emptyCard} onPress={addPresets}>
                <Text style={styles.emptyEmoji}>🌹</Text>
                <Text style={styles.emptyTitle}>Start your wishlist</Text>
                <Text style={styles.emptyText}>Tap to load 20 suggestions, or add your own</Text>
              </TouchableOpacity>
            )}
            {unvoted.length > 0 && <Text style={styles.groupLabel}>To vote on</Text>}
            {unvoted.map((item) => <WishCard key={item.id} item={item} onVote={handleVote} myVote={null} />)}
            {voted.length > 0 && <Text style={styles.groupLabel}>Already voted</Text>}
            {voted.map((item) => <WishCard key={item.id} item={item} onVote={handleVote} myVote={myVote(item)} />)}
          </>
        ) : (
          <>
            {matched.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>💞</Text>
                <Text style={styles.emptyTitle}>No matches yet</Text>
                <Text style={styles.emptyText}>When you both say Yes to something, it appears here</Text>
              </View>
            ) : (
              matched.map((item) => {
                const cfg = WISH_CATEGORY_CONFIG[item.category];
                const added = addedToList.has(item.id);
                return (
                  <View key={item.id} style={[styles.matchCard, { backgroundColor: cfg.color }]}>
                    <Text style={styles.matchEmoji}>{cfg.emoji}</Text>
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchText}>{item.text}</Text>
                      <Text style={styles.matchBadge}>✓ Both want this!</Text>
                      <TouchableOpacity
                        style={[styles.addToListBtn, added && styles.addToListBtnDone]}
                        onPress={() => handleAddToTogether(item)}
                        activeOpacity={0.8}
                        disabled={added}
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

      {/* Add modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add a wish</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Something you'd love to do..."
              placeholderTextColor={Colors.muted}
              value={newText}
              onChangeText={setNewText}
              multiline
            />
            <View style={styles.catRow}>
              {CATEGORIES.map((cat) => {
                const cfg = WISH_CATEGORY_CONFIG[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catBtn, newCat === cat && { backgroundColor: cfg.color, borderColor: Colors.border }]}
                    onPress={() => setNewCat(cat)}
                  >
                    <Text>{cfg.emoji}</Text>
                    <Text style={styles.catLabel}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
        title="Shared Wishlist"
        description="Vote on shared experiences privately. Your partner never sees your individual votes — only mutual Yes matches are ever revealed."
        tips={[
          'Tap ✓ Yes, ~ Maybe, or ✗ No on each wish',
          'Your votes are always private',
          'When you both say Yes → it appears in Matches',
          "Tap 'Add to Together List' on matches to plan them",
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </View>
  );
}

function WishCard({ item, onVote, myVote }: {
  item: WishlistItem;
  onVote: (item: WishlistItem, vote: WishVote) => void;
  myVote: WishVote | null;
}) {
  const cfg = WISH_CATEGORY_CONFIG[item.category];
  return (
    <View style={styles.wishCard}>
      <View style={styles.wishTop}>
        <View style={[styles.wishIconWrap, { backgroundColor: cfg.color }]}>
          <Text style={styles.wishEmoji}>{cfg.emoji}</Text>
        </View>
        <Text style={styles.wishText}>{item.text}</Text>
      </View>
      <View style={styles.voteRow}>
        {(['yes', 'maybe', 'no'] as WishVote[]).map((v) => {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  addBtn: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },

  infoBanner: { marginHorizontal: Spacing.lg, marginTop: Spacing.sm, backgroundColor: Colors.blush, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  infoText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.burgundy, textAlign: 'center' },

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
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center' },

  wishCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  wishTop: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  wishIconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  wishEmoji: { fontSize: 20 },
  wishText: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22, paddingTop: 2 },
  voteRow: { flexDirection: 'row', gap: Spacing.sm },
  voteBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  voteBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  matchCard: { borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  matchEmoji: { fontSize: 36 },
  matchInfo: { flex: 1, gap: 4 },
  matchText: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.text },
  matchBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.success },
  addToListBtn: { marginTop: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: 'rgba(0,0,0,0.08)' },
  addToListBtnDone: { backgroundColor: 'rgba(76,175,80,0.15)' },
  addToListBtnText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.text },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalInput: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.border },
  catRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  catBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', gap: 4, alignItems: 'center' },
  catLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.text },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
