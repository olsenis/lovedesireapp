import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { subscribeNotes, createNote, openNote, updateNote, deleteNote, LoveNote } from '../services/noteService';
import { ALL_MOODS, MOOD_LABELS, MoodEmoji } from '../services/moodService';
import { Colors as C } from '../constants/colors';
import { notifyPartner } from '../services/notificationService';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

type Condition = 'sad' | 'visit' | 'missing' | 'sleepless';
type Occasion = { label: string; offset: number; condition?: Condition };

// 'sad' is the generic mood-trigger occasion — user picks which mood unlocks it from a sub-grid
const SAD_OCCASION_LABEL = "When you're feeling...";

const OCCASIONS: Occasion[] = [
  { label: "Right now", offset: 0 },
  { label: "Tonight at 8pm", offset: 0 },
  { label: "This weekend", offset: -1 },
  { label: SAD_OCCASION_LABEL, offset: 0, condition: 'sad' },
];

const LDR_OCCASIONS: Occasion[] = [
  { label: "When I arrive", offset: 0, condition: 'visit' },
  { label: "When you miss me", offset: 0, condition: 'missing' },
  { label: "When you can't sleep", offset: 0, condition: 'sleepless' },
];

const CONDITION_META: Record<Condition, { emoji: string; label: string }> = {
  sad:       { emoji: '💙', label: SAD_OCCASION_LABEL },
  visit:     { emoji: '✈️', label: "When I arrive" },
  missing:   { emoji: '🤗', label: "When you miss me" },
  sleepless: { emoji: '🌙', label: "When you can't sleep" },
};

function getOccasionTime(label: string): number {
  const now = new Date();
  if (label === "Tonight at 8pm") {
    const t = new Date(now); t.setHours(20, 0, 0, 0);
    return t.getTime() < Date.now() ? t.getTime() + 86400000 : t.getTime();
  }
  if (label === "This weekend") {
    const t = new Date(now);
    const daysUntilSat = (6 - t.getDay() + 7) % 7 || 7;
    t.setDate(t.getDate() + daysUntilSat); t.setHours(9, 0, 0, 0);
    return t.getTime();
  }
  return Date.now();
}

function timeLabel(openAt: number): string {
  const diff = openAt - Date.now();
  if (diff <= 0) return 'Ready to open';
  if (diff < 60000) return 'Opens very soon';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `Opens in ${d}d${h > 0 ? ` ${h}h` : ''}`;
  if (h > 0) return `Opens in ${h}h${m > 0 ? ` ${m}m` : ''}`;
  return `Opens in ${m}m`;
}

export default function NotesScreen() {
  const { user, profile } = useAuth();
  const { couple } = useCouple(user?.uid, profile?.coupleId);
  const isLDR = !!couple?.isLongDistance;
  const occasions: Occasion[] = isLDR ? [...OCCASIONS, ...LDR_OCCASIONS] : OCCASIONS;
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const help = useHelp('love-notes');
  const [message, setMessage] = useState('');
  const [occasion, setOccasion] = useState(OCCASIONS[0].label);
  const [moodPick, setMoodPick] = useState<MoodEmoji>('😢');
  const [openedNote, setOpenedNote] = useState<LoveNote | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LoveNote | null>(null);

  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeNotes(profile.coupleId, setNotes);
  }, [profile?.coupleId]);

  const resetComposer = () => {
    setMessage('');
    setOccasion(OCCASIONS[0].label);
    setMoodPick('😢');
    setEditingNoteId(null);
  };

  const handleCreate = async () => {
    if (!message.trim() || !profile?.coupleId || !user) return;
    const occ = occasions.find(o => o.label === occasion);
    const openCondition = occ?.condition;
    const triggerEmoji = openCondition === 'sad' ? moodPick : undefined;

    if (editingNoteId) {
      // Edit existing — no notification re-fired
      await updateNote(profile.coupleId, editingNoteId, message.trim(), getOccasionTime(occasion), openCondition, triggerEmoji);
    } else {
      await createNote(profile.coupleId, user.uid, message.trim(), getOccasionTime(occasion), openCondition, triggerEmoji);
      const moodLabel = triggerEmoji ? MOOD_LABELS[triggerEmoji].toLowerCase() : '';
      const subtitle =
        openCondition === 'sad'      ? `A note will unlock when you feel ${moodLabel}` :
        openCondition === 'visit'    ? 'A note for when you arrive' :
        openCondition === 'missing'  ? 'A note for when you miss me' :
        openCondition === 'sleepless'? 'A note for when you can\'t sleep' :
        'A message is waiting for you';
      notifyPartner(profile.coupleId, user.uid, 'You have a love note 💌', subtitle).catch(() => {});
    }

    resetComposer();
    setShowCreate(false);
  };

  const handleEdit = (note: LoveNote) => {
    setEditingNoteId(note.id);
    setMessage(note.message);
    if (note.openCondition === 'sad') {
      setOccasion(SAD_OCCASION_LABEL);
      setMoodPick(note.triggerEmoji ?? '😢');
    } else if (note.openCondition && CONDITION_META[note.openCondition]) {
      setOccasion(CONDITION_META[note.openCondition].label);
    } else {
      setOccasion('Right now');
    }
    setShowCreate(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !profile?.coupleId) return;
    await deleteNote(profile.coupleId, deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const myNoteStatus = (note: LoveNote): string => {
    if (note.opened) return 'Opened ✓';
    if (note.openCondition === 'sad') {
      const emoji = note.triggerEmoji ?? '😢';
      return `Unlocks when partner feels ${emoji} ${MOOD_LABELS[emoji]}`;
    }
    if (note.openCondition === 'visit')     return 'Unlocks on your next visit';
    if (note.openCondition === 'missing')   return "In partner's Open When... stash";
    if (note.openCondition === 'sleepless') return "In partner's Open When... stash";
    return timeLabel(note.openAt);
  };

  const handleOpen = async (note: LoveNote) => {
    if (Date.now() < note.openAt) return;
    if (!profile?.coupleId) return;
    await openNote(profile.coupleId, note.id);
    setOpenedNote(note);
  };

  const myNotes = notes.filter((n) => n.fromUid === user?.uid);
  const forMeAll = notes.filter((n) => n.fromUid !== user?.uid);
  const isStash = (n: LoveNote) => n.openCondition === 'missing' || n.openCondition === 'sleepless';
  const forMeStash = forMeAll.filter((n) => isStash(n) && !n.opened);
  const forMe = forMeAll.filter((n) => !isStash(n));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Love Notes</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} accessibilityRole="button">
          <Text style={styles.createBtn}>Write</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {forMeStash.length > 0 && (
          <>
            <Text style={styles.groupLabel}>Open when... ✨</Text>
            <Text style={styles.stashHint}>Sealed letters from your partner. Open one when the moment hits.</Text>
            {forMeStash.map((note) => {
              const meta = note.openCondition ? CONDITION_META[note.openCondition] : null;
              return (
                <TouchableOpacity
                  key={note.id}
                  style={[styles.noteCard, styles.stashCard]}
                  onPress={() => handleOpen(note)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <View style={[styles.noteIconWrap, styles.stashIconWrap]}>
                    <Text style={styles.noteLockEmoji}>{meta?.emoji ?? '💌'}</Text>
                  </View>
                  <View style={styles.noteInfo}>
                    <Text style={styles.stashLabel}>{meta?.label ?? 'Open when'}</Text>
                    <Text style={styles.stashSub}>Tap when you're ready</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

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
                 accessibilityRole="button">
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
                  <Text style={styles.noteTime}>{myNoteStatus(note)}</Text>
                </View>
                {!note.opened && (
                  <View style={styles.myNoteActions}>
                    <TouchableOpacity
                      onPress={() => handleEdit(note)}
                      style={styles.myNoteActionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Edit note"
                    >
                      <Text style={styles.myNoteActionText}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setDeleteConfirm(note)}
                      style={styles.myNoteActionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Delete note"
                    >
                      <Text style={styles.myNoteActionText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {notes.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💌</Text>
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptyText}>Write a timed message your partner will love</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)} accessibilityRole="button">
              <Text style={styles.emptyBtnText}>Write a note</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create / Edit modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingNoteId ? 'Edit Love Note' : 'Write a Love Note'}</Text>
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
            <View style={styles.occasionRow}>
              {occasions.map((o) => {
                const isActive = occasion === o.label;
                const isCondition = !!o.condition;
                return (
                  <TouchableOpacity
                    key={o.label}
                    style={[
                      styles.occasionBtn,
                      isActive && styles.occasionActive,
                      isCondition && styles.occasionSad,
                      isCondition && isActive && styles.occasionSadActive,
                    ]}
                    onPress={() => setOccasion(o.label)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.occasionText, isActive && styles.occasionTextActive]}>
                      {o.condition ? `${CONDITION_META[o.condition].emoji} ` : ''}{o.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {occasion === SAD_OCCASION_LABEL && (
              <View style={styles.moodPickerWrap}>
                <Text style={styles.moodPickerLabel}>Unlocks when they log this mood:</Text>
                <View style={styles.moodPickerGrid}>
                  {ALL_MOODS.map((m) => {
                    const active = moodPick === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.moodPickerCell, active && styles.moodPickerCellActive]}
                        onPress={() => setMoodPick(m)}
                        accessibilityRole="button"
                        accessibilityLabel={`Trigger when partner is ${MOOD_LABELS[m]}`}
                      >
                        <Text style={styles.moodPickerEmoji}>{m}</Text>
                        <Text style={[styles.moodPickerName, active && styles.moodPickerNameActive]} numberOfLines={1}>
                          {MOOD_LABELS[m]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.sadHint}>Unlocks when your partner logs {moodPick} {MOOD_LABELS[moodPick]} mood</Text>
              </View>
            )}
            {occasion === "When I arrive" && (
              <Text style={styles.sadHint}>Unlocks automatically on the day of your next visit</Text>
            )}
            {occasion === "When you miss me" && (
              <Text style={styles.sadHint}>Goes into their "Open when..." stash. They open it whenever they miss you.</Text>
            )}
            {occasion === "When you can't sleep" && (
              <Text style={styles.sadHint}>Goes into their "Open when..." stash. They open it on a sleepless night.</Text>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { resetComposer(); setShowCreate(false); }}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendBtn} onPress={handleCreate} accessibilityRole="button">
                <Text style={styles.sendText}>{editingNoteId ? 'Save changes' : 'Send 💌'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <Modal visible transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={[styles.modal, { gap: Spacing.md }]}>
              <Text style={styles.modalTitle}>Delete this note?</Text>
              <Text style={styles.deleteHint}>Your partner won't see it. This cannot be undone.</Text>
              <View style={styles.deletePreview}>
                <Text style={styles.deletePreviewText} numberOfLines={3}>"{deleteConfirm.message}"</Text>
              </View>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteConfirm(null)} accessibilityRole="button">
                  <Text style={styles.cancelText}>Keep it</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: '#C62828' }]} onPress={confirmDelete} accessibilityRole="button">
                  <Text style={styles.sendText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Opened note viewer */}
      {openedNote && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={styles.noteViewer} onPress={() => setOpenedNote(null)} activeOpacity={1} accessibilityRole="button">
            <View style={styles.noteViewerCard}>
              <Text style={styles.noteViewerEmoji}>💌</Text>
              <Text style={styles.noteViewerMsg}>{openedNote.message}</Text>
              <Text style={styles.noteViewerHint}>Tap anywhere to close</Text>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <HelpModal
        visible={help.visible}
        title="Love Notes"
        description="Write a timed message that your partner can't open until the moment you choose."
        tips={[
          'Tap Write to compose a note',
          'Choose when it unlocks, right now, tonight, tomorrow, or next week',
          'Partner sees it exists but can\'t read it until the time comes',
          'Tap a ready note to open it',
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

  // Stash letters — sealed envelope feel, slightly elevated
  stashCard: { backgroundColor: '#FFF4E8', borderColor: '#E8C9A0', borderLeftWidth: 4, borderLeftColor: '#C9A77A' },
  stashIconWrap: { backgroundColor: 'rgba(201,167,122,0.18)' },
  stashLabel: { fontFamily: Fonts.headingItalic, fontSize: 18, color: Colors.burgundy },
  stashSub: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 2 },
  stashHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, marginBottom: 4, marginTop: -4 },

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
  occasionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  occasionBtn: { paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  occasionActive: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  occasionSad: { borderColor: '#90CAF9', backgroundColor: '#E3F2FD' },
  occasionSadActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  occasionText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  occasionTextActive: { color: Colors.cream, fontFamily: Fonts.bodyBold },
  sadHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: '#1565C0', marginTop: 4 },

  moodPickerWrap: { gap: Spacing.sm, marginTop: 4 },
  moodPickerLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  moodPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  moodPickerCell: {
    width: '23%', alignItems: 'center', justifyContent: 'center', gap: 2,
    paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  moodPickerCellActive: { backgroundColor: '#E3F2FD', borderColor: '#1565C0' },
  moodPickerEmoji: { fontSize: 22 },
  moodPickerName: { fontFamily: Fonts.body, fontSize: 9, color: Colors.muted, textAlign: 'center' },
  moodPickerNameActive: { color: '#1565C0', fontFamily: Fonts.bodyBold },

  myNoteActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  myNoteActionBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  myNoteActionText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },

  deleteHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, lineHeight: 19 },
  deletePreview: {
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  deletePreviewText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.text, lineHeight: 20 },
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
