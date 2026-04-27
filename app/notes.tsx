import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { subscribeNotes, createNote, openNote, LoveNote } from '../services/noteService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

const OCCASIONS = [
  { label: "Right now", offset: 0 },
  { label: "Tonight at 8pm", offset: -1 },
  { label: "Tomorrow morning", offset: -1 },
  { label: "This weekend", offset: -1 },
  { label: "In 1 week", offset: 7 * 24 * 60 * 60 * 1000 },
  { label: "When you're sad", offset: 0 },
];

function getOccasionTime(label: string): number {
  const now = new Date();
  if (label === "Right now" || label === "When you're sad") return Date.now();
  if (label === "Tonight at 8pm") {
    const t = new Date(now); t.setHours(20, 0, 0, 0);
    return t.getTime() < Date.now() ? t.getTime() + 86400000 : t.getTime();
  }
  if (label === "Tomorrow morning") {
    const t = new Date(now); t.setDate(t.getDate() + 1); t.setHours(8, 0, 0, 0);
    return t.getTime();
  }
  if (label === "This weekend") {
    const t = new Date(now);
    const daysUntilSat = (6 - t.getDay() + 7) % 7 || 7;
    t.setDate(t.getDate() + daysUntilSat); t.setHours(9, 0, 0, 0);
    return t.getTime();
  }
  if (label === "In 1 week") return Date.now() + 7 * 24 * 60 * 60 * 1000;
  return Date.now();
}

function timeLabel(openAt: number): string {
  const diff = openAt - Date.now();
  if (diff <= 0) return 'Ready to open';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `Opens in ${d}d ${h}h`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `Opens in ${h}h ${m}m`;
}

export default function NotesScreen() {
  const { user, profile } = useAuth();
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState('');
  const [occasion, setOccasion] = useState(OCCASIONS[0].label);
  const [openedNote, setOpenedNote] = useState<LoveNote | null>(null);

  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeNotes(profile.coupleId, setNotes);
  }, [profile?.coupleId]);

  const handleCreate = async () => {
    if (!message.trim() || !profile?.coupleId || !user) return;
    await createNote(profile.coupleId, user.uid, message.trim(), getOccasionTime(occasion));
    setMessage('');
    setShowCreate(false);
  };

  const handleOpen = async (note: LoveNote) => {
    if (Date.now() < note.openAt) return;
    if (!profile?.coupleId) return;
    await openNote(profile.coupleId, note.id);
    setOpenedNote(note);
  };

  const myNotes = notes.filter((n) => n.fromUid === user?.uid);
  const forMe = notes.filter((n) => n.fromUid !== user?.uid);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Love Notes</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)}>
          <Text style={styles.createBtn}>Write</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {forMe.length > 0 && (
          <>
            <Text style={styles.groupLabel}>For you 💌</Text>
            {forMe.map((note) => {
              const canOpen = Date.now() >= note.openAt;
              return (
                <TouchableOpacity
                  key={note.id}
                  style={[styles.noteCard, canOpen && !note.opened ? styles.noteReady : note.opened ? styles.noteOpened : styles.noteLocked]}
                  onPress={() => handleOpen(note)}
                  disabled={!canOpen}
                  activeOpacity={0.85}
                >
                  <View style={[styles.noteIconWrap, canOpen ? styles.noteIconReady : styles.noteIconLocked]}>
                    <Text style={styles.noteLockEmoji}>{note.opened ? '💌' : canOpen ? '✉️' : '🔒'}</Text>
                  </View>
                  <View style={styles.noteInfo}>
                    {note.opened ? (
                      <Text style={styles.noteText}>{note.message}</Text>
                    ) : (
                      <>
                        <Text style={styles.noteLockedText}>{canOpen ? 'Tap to open' : timeLabel(note.openAt)}</Text>
                        {!canOpen && <Text style={styles.noteTime}>A message is waiting for you</Text>}
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {myNotes.length > 0 && (
          <>
            <Text style={styles.groupLabel}>Notes you wrote ✍️</Text>
            {myNotes.map((note) => (
              <View key={note.id} style={[styles.noteCard, styles.mySent]}>
                <View style={styles.noteIconWrap}>
                  <Text style={styles.noteLockEmoji}>📝</Text>
                </View>
                <View style={styles.noteInfo}>
                  <Text style={styles.noteText} numberOfLines={2}>{note.message}</Text>
                  <Text style={styles.noteTime}>{timeLabel(note.openAt)}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {notes.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💌</Text>
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptyText}>Write a timed message your partner will love</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.emptyBtnText}>Write a note</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Write a Love Note</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Write something from the heart..."
              placeholderTextColor={Colors.muted}
              value={message}
              onChangeText={setMessage}
              multiline
              autoFocus
            />
            <Text style={styles.modalLabel}>When can it be opened?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50 }}>
              <View style={styles.occasionRow}>
                {OCCASIONS.map((o) => (
                  <TouchableOpacity
                    key={o.label}
                    style={[styles.occasionBtn, occasion === o.label && styles.occasionActive]}
                    onPress={() => setOccasion(o.label)}
                  >
                    <Text style={[styles.occasionText, occasion === o.label && styles.occasionTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendBtn} onPress={handleCreate}>
                <Text style={styles.sendText}>Send 💌</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Opened note viewer */}
      {openedNote && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={styles.noteViewer} onPress={() => setOpenedNote(null)} activeOpacity={1}>
            <View style={styles.noteViewerCard}>
              <Text style={styles.noteViewerEmoji}>💌</Text>
              <Text style={styles.noteViewerMsg}>{openedNote.message}</Text>
              <Text style={styles.noteViewerHint}>Tap anywhere to close</Text>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  createBtn: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md, paddingTop: Spacing.md },
  groupLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },

  noteCard: { flexDirection: 'row', borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  noteReady: { backgroundColor: Colors.blush, borderColor: Colors.rose },
  noteLocked: { backgroundColor: Colors.white },
  noteOpened: { backgroundColor: Colors.white, opacity: 0.7 },
  mySent: { backgroundColor: Colors.white },

  noteIconWrap: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cream, flexShrink: 0 },
  noteIconReady: { backgroundColor: 'rgba(244,167,185,0.3)' },
  noteIconLocked: { backgroundColor: Colors.cream },
  noteLockEmoji: { fontSize: 24 },

  noteInfo: { flex: 1 },
  noteText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  noteLockedText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
  noteTime: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 2 },

  empty: { flex: 1, alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, marginTop: Spacing.md },
  emptyBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  textarea: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, minHeight: 120, borderWidth: 1, borderColor: Colors.border },
  modalLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  occasionRow: { flexDirection: 'row', gap: Spacing.sm },
  occasionBtn: { paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  occasionActive: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  occasionText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  occasionTextActive: { color: Colors.cream, fontFamily: Fonts.bodyBold },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  sendBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  sendText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  noteViewer: { flex: 1, backgroundColor: 'rgba(61,26,36,0.7)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  noteViewerCard: { backgroundColor: Colors.cream, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.lg, maxWidth: 360, width: '100%' },
  noteViewerEmoji: { fontSize: 60 },
  noteViewerMsg: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text, textAlign: 'center', lineHeight: 34 },
  noteViewerHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
});
