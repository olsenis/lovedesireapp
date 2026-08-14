import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import {
  JournalEntry,
  subscribeJournal,
  addJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
} from '../services/journalService';
import { MoodEntry, subscribeToMoods } from '../services/moodService';
import { pickWeeklyPrompt, getRecentStreak, getWeeklyRetro } from '../services/journalPromptsService';
import { notifyPartner } from '../services/notificationService';
import { ConfirmModal } from '../components/ConfirmModal';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';

const MOODS: { key: NonNullable<JournalEntry['mood']>; emoji: string; label: string }[] = [
  { key: 'reflective', emoji: '🌙', label: 'Reflective' },
  { key: 'happy',      emoji: '😊', label: 'Happy' },
  { key: 'grateful',   emoji: '🙏', label: 'Grateful' },
  { key: 'frustrated', emoji: '😤', label: 'Frustrated' },
  { key: 'tender',     emoji: '💗', label: 'Tender' },
  { key: 'curious',    emoji: '✨', label: 'Curious' },
];

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `Today, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  }
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) {
    return `Yesterday, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function JournalScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  useTrackScreen('journal');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [text, setText] = useState('');
  const [moodPick, setMoodPick] = useState<JournalEntry['mood'] | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<JournalEntry | null>(null);
  // Track whether the compose was opened via the prompt card so we can
  // swap the modal title + textarea placeholder without adding a new
  // "prompt id" concept to the entry data. Cleared when the modal closes.
  const [composePrompt, setComposePrompt] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'your partner';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeJournal(coupleId, setEntries);
  }, [coupleId]);

  // Partner mood log — feeds the Sunday weekly retro card ("Ola felt 🥰
  // on 4 days"). Separate subscription from journal because moods and
  // journal are different feature surfaces with different data shapes.
  useEffect(() => {
    if (!coupleId) return;
    return subscribeToMoods(coupleId, setMoods);
  }, [coupleId]);

  // Weekly prompt — deterministic per (week, coupleId) so both partners
  // land on the same starting question. Recomputes weekly automatically
  // as the seed key changes on Sunday rollover.
  const weeklyPrompt = useMemo(
    () => (coupleId ? pickWeeklyPrompt(coupleId, partnerName) : null),
    [coupleId, partnerName],
  );

  // Consecutive-day writing streak. Only surfaces (in the header pill)
  // when >= 3, which the review calls "streak-lite" — encouragement
  // not gamification. Breaks silently on a missed day.
  const streak = useMemo(() => getRecentStreak(entries, uid), [entries, uid]);

  // Sunday-only retro card. Renders between the prompt card and the
  // entries list. Null on weekdays or when the week is entirely empty.
  const isSunday = new Date().getDay() === 0;
  const retro = useMemo(
    () => (isSunday && partnerId ? getWeeklyRetro(entries, moods, uid, partnerId) : null),
    [isSunday, entries, moods, uid, partnerId],
  );

  const openCompose = (entry?: JournalEntry, opts?: { prompt?: string }) => {
    if (entry) {
      setEditing(entry);
      setText(entry.text);
      setMoodPick(entry.mood ?? null);
      setComposePrompt(null);
    } else {
      setEditing(null);
      setText('');
      setMoodPick(null);
      setComposePrompt(opts?.prompt ?? null);
    }
    setShowCompose(true);
  };

  const handleSave = async () => {
    if (!text.trim() || !coupleId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editing) {
      await updateJournalEntry(coupleId, editing.id, text.trim(), moodPick ?? undefined);
    } else {
      await addJournalEntry(coupleId, uid, text.trim(), moodPick ?? undefined);
      notifyPartner(
        coupleId,
        uid,
        `${profile?.name ?? 'Partner'} wrote in the journal 📓`,
        text.trim().slice(0, 80),
      ).catch(() => {});
    }
    setText('');
    setMoodPick(null);
    setEditing(null);
    setComposePrompt(null);
    setShowCompose(false);
  };

  const handleDelete = (entry: JournalEntry) => setDeleteConfirm(entry);

  const confirmDelete = async () => {
    if (!coupleId || !deleteConfirm) return;
    await deleteJournalEntry(coupleId, deleteConfirm.id);
    setDeleteConfirm(null);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Journal</Text>
          {streak >= 3 && (
            <View style={styles.streakPill}>
              <Text style={styles.streakPillText}>🔥 {streak}-day streak</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => openCompose()} accessibilityRole="button">
          <Text style={styles.writeBtn}>Write</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.list}>
        {/* Weekly prompt — always visible, tap to open compose with the
            prompt as placeholder. Blank-page killer. */}
        {weeklyPrompt && (
          <View style={styles.promptCard}>
            <Text style={styles.promptEyebrow}>THIS WEEK'S PROMPT</Text>
            <Text style={styles.promptText}>{weeklyPrompt}</Text>
            <TouchableOpacity
              style={styles.promptCta}
              onPress={() => openCompose(undefined, { prompt: weeklyPrompt })}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Reflect on this week's prompt"
            >
              <Text style={styles.promptCtaText}>Reflect on it →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sunday-only weekly retro card. Disposable — appears Sunday,
            vanishes Monday. No archive. */}
        {retro && (
          <View style={styles.retroCard}>
            <Text style={styles.retroEyebrow}>{retro.weekLabel.toUpperCase()}</Text>
            <Text style={styles.retroPara}>
              You wrote {retro.myCount} {retro.myCount === 1 ? 'time' : 'times'}
              {partnerId ? `, ${partnerName} wrote ${retro.partnerCount} ${retro.partnerCount === 1 ? 'time' : 'times'}` : ''}
              {' '}this week.
            </Text>
            {retro.dominantMoods.length > 0 && (
              <Text style={styles.retroPara}>
                Mostly {retro.dominantMoods.join(' and ')}.
              </Text>
            )}
            {retro.partnerMoodDays.length > 0 && (
              <Text style={styles.retroPara}>
                {partnerName} felt {retro.partnerMoodDays
                  .map((m) => `${m.emoji} on ${m.count} ${m.count === 1 ? 'day' : 'days'}`)
                  .join(', ')}.
              </Text>
            )}
          </View>
        )}

        {entries.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📓</Text>
            <Text style={styles.emptyTitle}>Your shared journal</Text>
            <Text style={styles.emptyText}>
              A private space for both of you to write what you're thinking. Reflections, gratitude, frustrations, anything you want {partnerName} to see.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => openCompose()} accessibilityRole="button">
              <Text style={styles.emptyBtnText}>Write the first entry</Text>
            </TouchableOpacity>
          </View>
        )}

        {entries.map((entry) => {
          const mine = entry.fromUid === uid;
          const moodMeta = entry.mood ? MOODS.find((m) => m.key === entry.mood) : null;
          return (
            <View key={entry.id} style={[styles.card, mine && styles.cardMine]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardAuthor}>
                  {mine ? 'You' : (partner?.name ?? 'Partner')}
                </Text>
                {moodMeta && (
                  <Text style={styles.cardMood}>{moodMeta.emoji} {moodMeta.label}</Text>
                )}
                <Text style={styles.cardDate}>{formatDate(entry.createdAt)}</Text>
              </View>
              <Text style={styles.cardText}>{entry.text}</Text>
              {entry.updatedAt && (
                <Text style={styles.cardEdited}>edited {formatDate(entry.updatedAt)}</Text>
              )}
              {mine && (
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openCompose(entry)} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.cardActionText}>✎ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(entry)} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityHint="Cannot be undone">
                    <Text style={[styles.cardActionText, styles.cardActionDelete]}>✕ Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Compose / Edit modal */}
      <Modal visible={showCompose} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editing ? 'Edit entry' : composePrompt ? "This week's prompt" : 'New journal entry'}
            </Text>
            {composePrompt && !editing && (
              <Text style={styles.modalPromptText}>{composePrompt}</Text>
            )}
            <TextInput
              style={styles.textarea}
              placeholder={composePrompt ? 'Reflect here…' : "What's on your mind?"}
              placeholderTextColor={Colors.muted}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
            />
            <Text style={styles.modalLabel}>How does it feel? (optional)</Text>
            <View style={styles.moodRow}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.moodChip, moodPick === m.key && styles.moodChipActive]}
                  onPress={() => setMoodPick(moodPick === m.key ? null : m.key)}
                  accessibilityRole="button"
                >
                  <Text style={styles.moodChipEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodChipText, moodPick === m.key && styles.moodChipTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCompose(false); setEditing(null); setComposePrompt(null); }} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !text.trim() && { opacity: 0.4 }]}
                onPress={handleSave}
                disabled={!text.trim()}
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>{editing ? 'Save changes' : 'Add to journal'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!deleteConfirm}
        title="Delete entry"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
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
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  streakPill: {
    backgroundColor: Colors.blush,
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.rose,
  },
  streakPillText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.burgundy, letterSpacing: 0.3 },
  writeBtn: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },

  // Weekly prompt card — always at top of list, rose-tinted so it feels
  // like an invitation rather than another entry.
  promptCard: {
    backgroundColor: '#FFF5F8',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.rose,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  promptEyebrow: {
    fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted,
    letterSpacing: 0.8,
  },
  promptText: {
    fontFamily: Fonts.heading, fontSize: 20, color: Colors.text,
    lineHeight: 28,
  },
  promptCta: {
    alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: Spacing.md,
    borderRadius: Radius.full, backgroundColor: Colors.burgundy, marginTop: 4,
  },
  promptCtaText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.cream },

  // Sunday-only weekly retro card. Distinct from prompt card (cream bg,
  // no rose stripe) so users can tell them apart at a glance.
  retroCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  retroEyebrow: {
    fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted,
    letterSpacing: 0.8, marginBottom: 4,
  },
  retroPara: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },

  list: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  cardMine: { backgroundColor: Colors.blush, borderColor: Colors.rose },
  cardHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  cardAuthor: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  cardMood: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  cardDate: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginLeft: 'auto' },
  cardText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  cardEdited: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted },
  cardActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  cardActionText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted },
  cardActionDelete: { color: '#C62828' },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md, paddingHorizontal: Spacing.lg },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, marginTop: Spacing.md },
  emptyBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalPromptText: {
    fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text,
    lineHeight: 22, marginTop: -Spacing.sm,
  },
  textarea: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
    minHeight: 140, borderWidth: 1, borderColor: Colors.border, textAlignVertical: 'top',
  },
  modalLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  moodChipActive: { backgroundColor: Colors.blush, borderColor: Colors.rose },
  moodChipEmoji: { fontSize: 16 },
  moodChipText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  moodChipTextActive: { color: Colors.burgundy, fontFamily: Fonts.bodyBold },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
