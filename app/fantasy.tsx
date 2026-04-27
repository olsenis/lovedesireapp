import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { FantasyItem, FantasyVote, subscribeFantasy, addFantasyItem, voteOnFantasy, isFantasyMatch } from '../services/fantasyService';
import { FANTASY_PRESETS, FANTASY_CATEGORY_CONFIG, FantasyCategory } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

const CATEGORIES: FantasyCategory[] = ['roleplay', 'sensual', 'bold', 'adventurous'];

export default function FantasyScreen() {
  const { user, profile } = useAuth();
  const { couple } = useCouple(user?.uid, profile?.coupleId);
  const [items, setItems] = useState<FantasyItem[]>([]);
  const [activeTab, setActiveTab] = useState<'vote' | 'matches'>('vote');
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCat, setNewCat] = useState<FantasyCategory>('sensual');
  const [loadingPresets, setLoadingPresets] = useState(false);

  const coupleId = profile?.coupleId;
  const partnerId = couple?.partner1Uid === user?.uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeFantasy(coupleId, setItems);
  }, [coupleId]);

  const handleVote = async (item: FantasyItem, vote: FantasyVote) => {
    if (!coupleId || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await voteOnFantasy(coupleId, item.id, user.uid, vote);
  };

  const handleAdd = async () => {
    if (!newText.trim() || !coupleId) return;
    await addFantasyItem(coupleId, newText.trim(), newCat);
    setNewText('');
    setShowAdd(false);
  };

  const loadPresets = async () => {
    const id = profile?.coupleId;
    if (!id || loadingPresets) return;
    setLoadingPresets(true);
    try {
      await Promise.all(FANTASY_PRESETS.map((p) => addFantasyItem(id, p.text, p.category)));
    } finally {
      setLoadingPresets(false);
    }
  };

  const myVote = (item: FantasyItem): FantasyVote | null =>
    user ? (item.votes[user.uid] as FantasyVote) ?? null : null;

  const matched = items.filter((i) => user?.uid && partnerId && isFantasyMatch(i, user.uid, partnerId));
  const unvoted = items.filter((i) => !myVote(i));
  const voted = items.filter((i) => myVote(i));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Fantasy Match</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtn}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>✨ Vote privately — only mutual matches are revealed to both of you</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'vote' && styles.tabActive]} onPress={() => setActiveTab('vote')}>
          <Text style={[styles.tabText, activeTab === 'vote' && styles.tabTextActive]}>Explore ({items.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'matches' && styles.tabActive]} onPress={() => setActiveTab('matches')}>
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>✓ Matches ({matched.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        {activeTab === 'vote' ? (
          <>
            {items.length === 0 && (
              <TouchableOpacity style={styles.emptyCard} onPress={loadPresets} disabled={loadingPresets} activeOpacity={0.7}>
                <Text style={styles.emptyEmoji}>{loadingPresets ? '⏳' : '✨'}</Text>
                <Text style={styles.emptyTitle}>{loadingPresets ? 'Loading…' : 'Explore together'}</Text>
                <Text style={styles.emptyText}>
                  {loadingPresets
                    ? 'Adding 60 scenarios — this takes a moment'
                    : 'Tap to load 60 fantasy scenarios — or add your own. Only mutual interests are ever revealed.'}
                </Text>
              </TouchableOpacity>
            )}
            {unvoted.length > 0 && <Text style={styles.groupLabel}>To explore</Text>}
            {unvoted.map((item) => (
              <FantasyCard key={item.id} item={item} onVote={handleVote} myVote={null} />
            ))}
            {voted.length > 0 && <Text style={styles.groupLabel}>Already rated</Text>}
            {voted.map((item) => (
              <FantasyCard key={item.id} item={item} onVote={handleVote} myVote={myVote(item)} />
            ))}
          </>
        ) : (
          <>
            {matched.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>💫</Text>
                <Text style={styles.emptyTitle}>No matches yet</Text>
                <Text style={styles.emptyText}>When you both say Yes to something, it appears here — and only then</Text>
              </View>
            ) : (
              matched.map((item) => {
                const cfg = FANTASY_CATEGORY_CONFIG[item.category];
                return (
                  <View key={item.id} style={[styles.matchCard, { backgroundColor: cfg.color }]}>
                    <Text style={styles.matchEmoji}>{cfg.emoji}</Text>
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchText}>{item.text}</Text>
                      <Text style={styles.matchBadge}>✓ You both want this</Text>
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
            <Text style={styles.modalTitle}>Add a fantasy</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe a scenario or experience..."
              placeholderTextColor={Colors.muted}
              value={newText}
              onChangeText={setNewText}
              multiline
            />
            <View style={styles.catRow}>
              {CATEGORIES.map((cat) => {
                const cfg = FANTASY_CATEGORY_CONFIG[cat];
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
    </View>
  );
}

function FantasyCard({ item, onVote, myVote }: {
  item: FantasyItem;
  onVote: (item: FantasyItem, vote: FantasyVote) => void;
  myVote: FantasyVote | null;
}) {
  const cfg = FANTASY_CATEGORY_CONFIG[item.category];
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIconWrap, { backgroundColor: cfg.color }]}>
          <Text style={styles.cardEmoji}>{cfg.emoji}</Text>
        </View>
        <Text style={styles.cardText}>{item.text}</Text>
      </View>
      <View style={styles.voteRow}>
        {(['yes', 'maybe', 'no'] as FantasyVote[]).map((v) => {
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

  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  cardIconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardEmoji: { fontSize: 20 },
  cardText: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22, paddingTop: 2 },
  voteRow: { flexDirection: 'row', gap: Spacing.sm },
  voteBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  voteBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  matchCard: { borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  matchEmoji: { fontSize: 36 },
  matchInfo: { flex: 1, gap: 4 },
  matchText: { fontFamily: Fonts.heading, fontSize: 17, color: Colors.text, lineHeight: 24 },
  matchBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.success },

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
