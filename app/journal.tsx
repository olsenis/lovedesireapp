import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Platform } from 'react-native';
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
import { notifyPartner } from '../services/notificationService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

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
  const { partner } = useCouple(user?.uid, profile?.coupleId);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [text, setText] = useState('');
  const [moodPick, setMoodPick] = useState<JournalEntry['mood'] | null>(null);

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeJournal(coupleId, setEntries);
  }, [coupleId]);

  const openCompose = (entry?: JournalEntry) => {
    if (entry) {
      setEditing(entry);
      setText(entry.text);
      setMoodPick(entry.mood ?? null);
    } else {
      setEditing(null);
      setText('');
      setMoodPick(null);
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
    setShowCompose(false);
  };

  const handleDelete = (entry: JournalEntry) => {
    if (!coupleId) return;
    const doDelete = async () => { await deleteJournalEntry(coupleId, entry.id); };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this entry?')) doDelete();
    } else {
      Alert.alert('Delete entry', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Journal</Text>
        <TouchableOpacity onPress={() => openCompose()} accessibilityRole="button">
          <Text style={styles.writeBtn}>Write</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {entries.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📓</Text>
            <Text style={styles.emptyTitle}>Your shared journal</Text>
            <Text style={styles.emptyText}>
              A private space for both of you to write what you're thinking. Reflections, gratitude, frustrations — anything you want them to see.
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
                  <TouchableOpacity onPress={() => handleDelete(entry)} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
            <Text style={styles.modalTitle}>{editing ? 'Edit entry' : 'New journal entry'}</Text>
            <TextInput
              style={styles.textarea}
              placeholder="What's on your mind?"
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
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCompose(false); setEditing(null); }} accessibilityRole="button">
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
  writeBtn: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },

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
