import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { subscribeNotes, createNote, openNote, updateNote, deleteNote, renameNote, LoveNote } from '../services/noteService';
import { ALL_MOODS, MOOD_LABELS, MoodEmoji } from '../services/moodService';
import { Colors as C } from '../constants/colors';
import { notifyPartner } from '../services/notificationService';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { BrandDatePicker } from '../components/BrandDatePicker';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { VoicePlayer } from '../components/VoicePlayer';
import { uploadVoiceNote } from '../services/storageService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { trackEvent } from '../services/statsService';

type Condition = 'sad' | 'visit' | 'missing' | 'sleepless';
type Occasion = { label: string; offset: number; condition?: Condition };

// 'sad' is the generic mood-trigger occasion — user picks which mood unlocks it from a sub-grid
const SAD_OCCASION_LABEL = "When you're feeling...";
// Custom-date occasion — user picks a specific day from the calendar picker
const CUSTOM_DATE_LABEL = "Pick a date...";

const OCCASIONS: Occasion[] = [
  { label: "Right now", offset: 0 },
  { label: "Tonight at 8pm", offset: 0 },
  { label: "This weekend", offset: -1 },
  { label: CUSTOM_DATE_LABEL, offset: 0 },
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

// Sentinel openAt used by createNote for auto-unlock (sad/visit) notes so
// the time-based path never fires. Kept in sync with noteService.
const AUTO_UNLOCK_SENTINEL = 32503680000000; // year 9999

// Display title for a voice note in the list. Text notes render their
// message inline so they don't need this helper.
//
// Priority chain:
//  1. Recipient's manual label if set (via long-press → Rename)
//  2. Author's optional caption (message field)
//  3. Auto-generated context label — condition-based first, then date-based
//  4. Generic "Voice note" fallback
//
// Reason for auto-generation: if a couple exchanges 5+ voice notes over
// weeks, all captioned "" and all shown as "Voice note", the list becomes
// indistinguishable. Contextual labels ("For 😍 days", "For your next visit")
// give each one a memorable identity without requiring the recipient to
// rename anything.
function voiceNoteTitle(note: LoveNote): string {
  if (note.label?.trim()) return note.label.trim();
  if (note.message?.trim()) return note.message.trim();
  if (note.openCondition === 'sad') {
    const emoji = note.triggerEmoji ?? '😢';
    return `For ${emoji} days`;
  }
  if (note.openCondition === 'visit') return 'For when you arrive';
  if (note.openCondition === 'missing') return 'For when you miss me';
  if (note.openCondition === 'sleepless') return 'For sleepless nights';
  // Time-scheduled with a meaningful future openAt — show the target date.
  // Skip sentinel (auto-unlock notes above already handled) and skip notes
  // where openAt is within an hour of createdAt (those are "right now" notes
  // and have no time-context worth showing).
  if (note.openAt < AUTO_UNLOCK_SENTINEL && note.openAt > note.createdAt + 60 * 60 * 1000) {
    const d = new Date(note.openAt);
    const dateStr = d.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' });
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `For ${dateStr} at ${timeStr}`;
  }
  return 'Voice note';
}

function timeLabel(note: LoveNote): string {
  // Condition-driven notes never open on a clock — surface what actually
  // unlocks them so the sender doesn't see the raw 2.9-billion-day countdown.
  if (note.openAt >= AUTO_UNLOCK_SENTINEL) {
    if (note.openCondition === 'sad') {
      const emoji = note.triggerEmoji ?? '😢';
      const label = MOOD_LABELS[emoji as MoodEmoji] ?? 'that mood';
      return `Unlocks when partner feels ${label}`;
    }
    if (note.openCondition === 'visit') return 'Unlocks on next visit';
    if (note.openCondition === 'missing') return 'For when you miss them';
    if (note.openCondition === 'sleepless') return "For when you can't sleep";
    return 'Unlocks on a condition';
  }
  const diff = note.openAt - Date.now();
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
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const isLDR = !!couple?.isLongDistance;
  const occasions: Occasion[] = isLDR ? [...OCCASIONS, ...LDR_OCCASIONS] : OCCASIONS;
  useTrackScreen('notes');
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const help = useHelp('love-notes');
  const [message, setMessage] = useState('');
  const [occasion, setOccasion] = useState(OCCASIONS[0].label);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [moodPick, setMoodPick] = useState<MoodEmoji>('😢');
  const [openedNote, setOpenedNote] = useState<LoveNote | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LoveNote | null>(null);
  // Voice-mode composer state (Aug 2026). mediaType toggles between text
  // and voice; voiceUri holds the local file:// path from VoiceRecorder
  // between record + Send. Uploaded to Firebase Storage on Send only, so
  // discarding before Send costs no bandwidth. Message field is still
  // rendered in voice mode as an optional caption.
  const [mediaType, setMediaType] = useState<'text' | 'voice'>('text');
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  // Rename modal state — user long-presses a voice note to change its label.
  // renameTarget=null when modal is closed; the LoveNote when active. Draft
  // holds the pending new label; empty string on save clears any existing label.
  const [renameTarget, setRenameTarget] = useState<LoveNote | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeNotes(profile.coupleId, setNotes);
  }, [profile?.coupleId]);

  // If the couple toggles LDR off while the composer was left with an LDR
  // occasion selected (e.g. 'When I arrive'), the current occasion is no
  // longer in the list. Snap back to the safe default so the picker row
  // doesn't render as "nothing selected" and Send doesn't fire an LDR-only
  // note for a non-LDR couple.
  useEffect(() => {
    if (!occasions.some((o) => o.label === occasion)) {
      setOccasion(OCCASIONS[0].label);
    }
  }, [isLDR, occasion, occasions]);

  const resetComposer = () => {
    setMessage('');
    setOccasion(OCCASIONS[0].label);
    setCustomDate(null);
    setMoodPick('😢');
    setEditingNoteId(null);
    setMediaType('text');
    setVoiceUri(null);
    setUploadingVoice(false);
  };

  const handleCreate = async () => {
    if (!profile?.coupleId || !user) return;
    // Voice mode requires a recorded clip. Text mode requires message text.
    // Voice with an optional text caption is fine — caption is empty allowed.
    if (mediaType === 'voice' && !voiceUri) return;
    if (mediaType === 'text' && !message.trim()) return;
    if (occasion === CUSTOM_DATE_LABEL && !customDate) return;
    const occ = occasions.find(o => o.label === occasion);
    const openCondition = occ?.condition;
    const triggerEmoji = openCondition === 'sad' ? moodPick : undefined;
    const openAt = occasion === CUSTOM_DATE_LABEL && customDate
      ? customDate.getTime()
      : getOccasionTime(occasion);

    if (editingNoteId) {
      // Edit path only touches text + timing/condition. Voice notes can have
      // their caption + timing edited but not re-recorded (see updateNote).
      await updateNote(profile.coupleId, editingNoteId, message.trim(), openAt, openCondition, triggerEmoji);
    } else {
      let audioURL: string | undefined;
      if (mediaType === 'voice' && voiceUri) {
        setUploadingVoice(true);
        try {
          audioURL = await uploadVoiceNote(profile.coupleId, user.uid, voiceUri);
        } catch (e) {
          console.warn('Voice note upload failed', e);
          setUploadingVoice(false);
          return; // Don't create the doc without the audio blob
        }
        setUploadingVoice(false);
      }
      await createNote(profile.coupleId, user.uid, message.trim(), openAt, openCondition, triggerEmoji, audioURL);
      trackEvent(mediaType === 'voice' ? 'voice_note_created' : 'love_note_created');
      const moodLabel = triggerEmoji ? MOOD_LABELS[triggerEmoji].toLowerCase() : '';
      const mediaWord = mediaType === 'voice' ? 'voice note' : 'note';
      const subtitle =
        openCondition === 'sad'      ? `A ${mediaWord} will unlock when you feel ${moodLabel}` :
        openCondition === 'visit'    ? `A ${mediaWord} for when you arrive` :
        openCondition === 'missing'  ? `A ${mediaWord} for when you miss me` :
        openCondition === 'sleepless'? `A ${mediaWord} for when you can\'t sleep` :
        mediaType === 'voice'        ? 'A voice message is waiting for you' :
                                       'A message is waiting for you';
      const title = mediaType === 'voice' ? 'You have a voice note 🎤' : 'You have a love note 💌';
      notifyPartner(profile.coupleId, user.uid, title, subtitle).catch(() => {});
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
    } else if (note.openAt > Date.now() + 60000) {
      // Future openAt without a condition — surface it in the date picker so
      // the user can see what they picked, keep it, or change it. Preserves
      // the exact chosen day instead of collapsing to 'Right now'.
      setOccasion(CUSTOM_DATE_LABEL);
      setCustomDate(new Date(note.openAt));
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

  // Long-press handler for voice notes — opens the rename modal seeded with
  // the current display title (label / caption / auto-title) so the user can
  // tweak rather than start from a blank field.
  const startRename = (note: LoveNote) => {
    setRenameTarget(note);
    setRenameDraft(note.label ?? note.message ?? '');
  };

  const confirmRename = async () => {
    if (!renameTarget || !profile?.coupleId) return;
    await renameNote(profile.coupleId, renameTarget.id, renameDraft);
    setRenameTarget(null);
    setRenameDraft('');
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
    return timeLabel(note);
  };


  const handleOpen = async (note: LoveNote) => {
    if (Date.now() < note.openAt) return;
    if (!profile?.coupleId) return;
    await openNote(profile.coupleId, note.id);
    trackEvent(note.audioURL ? 'voice_note_opened' : 'love_note_opened');
    setOpenedNote(note);
  };

  // Guard against user still loading — otherwise n.fromUid === undefined is
  // false for every note, and n.fromUid !== undefined is true for every note,
  // so the recipient section briefly renders every note including own ones.
  const myNotes = user ? notes.filter((n) => n.fromUid === user.uid) : [];
  const forMeAll = user ? notes.filter((n) => n.fromUid !== user.uid) : [];
  const isStash = (n: LoveNote) => n.openCondition === 'missing' || n.openCondition === 'sleepless';
  const isSecret = (n: LoveNote) => n.openCondition === 'sad' || n.openCondition === 'visit';
  const forMeStash = forMeAll.filter((n) => isStash(n) && !n.opened);
  // Hide sad/visit locked notes from the recipient entirely — the surprise
  // is the whole point. Once the mood is picked or the visit arrives,
  // unlockMoodNotes/unlockVisitNotes flips openAt to now(), the note passes
  // this filter, and pops into the list as ready to open.
  const forMe = forMeAll.filter((n) => {
    if (isStash(n)) return false;
    if (isSecret(n) && !n.opened && Date.now() < n.openAt) return false;
    return true;
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
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
            <Text style={styles.groupLabel}>From {partner?.name ?? 'your partner'} 💌</Text>
            {forMe.map((note) => {
              const canOpen = Date.now() >= note.openAt;
              return (
                <TouchableOpacity
                  key={note.id}
                  style={[styles.noteCard, canOpen && !note.opened ? styles.noteReady : note.opened ? styles.noteOpened : styles.noteLocked]}
                  onPress={() => handleOpen(note)}
                  onLongPress={note.mediaType === 'voice' ? () => startRename(note) : undefined}
                  delayLongPress={400}
                  disabled={!canOpen}
                  activeOpacity={0.85}
                 accessibilityRole="button">
                  <View style={[styles.noteIconWrap, canOpen ? styles.noteIconReady : styles.noteIconLocked]}>
                    <Text style={styles.noteLockEmoji}>
                      {note.mediaType === 'voice' && !note.opened
                        ? (canOpen ? '🎤' : '🔒')
                        : (note.opened ? '💌' : canOpen ? '✉️' : '🔒')}
                    </Text>
                  </View>
                  <View style={styles.noteInfo}>
                    {note.opened ? (
                      note.mediaType === 'voice' ? (
                        <Text style={styles.noteText} numberOfLines={1}>🎤 {voiceNoteTitle(note)}</Text>
                      ) : (
                        <Text style={styles.noteText}>{note.message}</Text>
                      )
                    ) : (
                      <>
                        <Text style={styles.noteLockedText}>
                          {canOpen
                            ? (note.mediaType === 'voice' ? `Tap to hear · ${voiceNoteTitle(note)}` : 'Tap to open')
                            : timeLabel(note)}
                        </Text>
                        {!canOpen && (
                          <Text style={styles.noteTime}>
                            {note.mediaType === 'voice' ? 'A voice note is waiting for you' : 'A message is waiting for you'}
                          </Text>
                        )}
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
              <TouchableOpacity
                key={note.id}
                style={[styles.noteCard, styles.mySent]}
                onLongPress={note.mediaType === 'voice' ? () => startRename(note) : undefined}
                delayLongPress={400}
                activeOpacity={note.mediaType === 'voice' ? 0.85 : 1}
                accessibilityRole={note.mediaType === 'voice' ? 'button' : undefined}
              >
                <View style={styles.noteIconWrap}>
                  <Text style={styles.noteLockEmoji}>{note.mediaType === 'voice' ? '🎤' : '📝'}</Text>
                </View>
                <View style={styles.noteInfo}>
                  <Text style={styles.noteText} numberOfLines={2}>
                    {note.mediaType === 'voice' ? `🎤 ${voiceNoteTitle(note)}` : note.message}
                  </Text>
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
              </TouchableOpacity>
            ))}
          </>
        )}

        {notes.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💌</Text>
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptyText}>Save a note or voice message for a moment yet to come.</Text>
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

            {/* Mode toggle — only offered on new notes. Editing keeps the
                original media type since re-recording isn't supported in
                edit mode (see updateNote comment). */}
            {!editingNoteId && (
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, mediaType === 'text' && styles.modeBtnActive]}
                  onPress={() => setMediaType('text')}
                  accessibilityRole="button"
                  accessibilityLabel="Text note"
                >
                  <Text style={[styles.modeBtnText, mediaType === 'text' && styles.modeBtnTextActive]}>✎ Text</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, mediaType === 'voice' && styles.modeBtnActive]}
                  onPress={() => setMediaType('voice')}
                  accessibilityRole="button"
                  accessibilityLabel="Voice note"
                >
                  <Text style={[styles.modeBtnText, mediaType === 'voice' && styles.modeBtnTextActive]}>🎤 Voice</Text>
                </TouchableOpacity>
              </View>
            )}

            {mediaType === 'voice' && !editingNoteId ? (
              <View style={styles.voiceComposeWrap}>
                <VoiceRecorder
                  currentUri={voiceUri}
                  onRecorded={setVoiceUri}
                  onCleared={() => setVoiceUri(null)}
                />
                {voiceUri && (
                  <TextInput
                    style={[styles.textarea, { minHeight: 60 }]}
                    placeholder="Add a caption (optional)"
                    placeholderTextColor={Colors.muted}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={280}
                  />
                )}
              </View>
            ) : (
              <TextInput
                style={styles.textarea}
                placeholder="Write something from the heart..."
                placeholderTextColor={Colors.muted}
                value={message}
                onChangeText={setMessage}
                multiline
                autoFocus={!editingNoteId}
              />
            )}
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
            {occasion === CUSTOM_DATE_LABEL && (
              <View style={{ gap: Spacing.sm, marginTop: 4 }}>
                <BrandDatePicker
                  value={customDate}
                  onChange={setCustomDate}
                  placeholder="When should it open?"
                  mode="datetime"
                  minimumDate={new Date(Date.now() + 5 * 60 * 1000)}
                />
                {customDate ? (
                  <Text style={styles.sadHint}>
                    Opens {customDate.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' })} at {customDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </Text>
                ) : (
                  <Text style={styles.sadHint}>Pick any future date and time.</Text>
                )}
              </View>
            )}
            {occasion === SAD_OCCASION_LABEL && (
              <View style={styles.moodPickerWrap}>
                <Text style={styles.moodPickerLabel}>Unlocks when {partner?.name ?? 'your partner'} logs this mood:</Text>
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
              <Text style={styles.sadHint}>Goes into your partner's "Open when..." stash, for whenever they miss you.</Text>
            )}
            {occasion === "When you can't sleep" && (
              <Text style={styles.sadHint}>Goes into your partner's "Open when..." stash, for a sleepless night.</Text>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { resetComposer(); setShowCreate(false); }}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  ((mediaType === 'text' && !message.trim()) ||
                    (mediaType === 'voice' && !editingNoteId && !voiceUri) ||
                    (occasion === CUSTOM_DATE_LABEL && !customDate) ||
                    uploadingVoice) && styles.sendBtnDisabled,
                ]}
                onPress={handleCreate}
                disabled={
                  (mediaType === 'text' && !message.trim()) ||
                  (mediaType === 'voice' && !editingNoteId && !voiceUri) ||
                  (occasion === CUSTOM_DATE_LABEL && !customDate) ||
                  uploadingVoice
                }
                accessibilityRole="button"
              >
                <Text style={styles.sendText}>
                  {uploadingVoice ? 'Uploading...' : editingNoteId ? 'Save changes' : mediaType === 'voice' ? 'Send 🎤' : 'Send 💌'}
                </Text>
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
                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: '#C62828' }]} onPress={confirmDelete} accessibilityRole="button" accessibilityHint="Cannot be undone">
                  <Text style={styles.sendText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Opened note viewer. Voice notes show the player prominently + the
          title (label/caption/auto) + caption below when both exist. Text
          notes show the message only. Rename link available for voice notes. */}
      {openedNote && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={styles.noteViewer} onPress={() => setOpenedNote(null)} activeOpacity={1} accessibilityRole="button">
            <View style={styles.noteViewerCard}>
              <Text style={styles.noteViewerEmoji}>{openedNote.mediaType === 'voice' ? '🎤' : '💌'}</Text>
              {openedNote.mediaType === 'voice' && openedNote.audioURL && (
                <>
                  <Text style={styles.noteViewerTitle}>{voiceNoteTitle(openedNote)}</Text>
                  <VoicePlayer uri={openedNote.audioURL} size="large" idleLabel="Tap to hear" />
                  {/* Show caption below player if it differs from the display title
                      (i.e., user has a custom label and author's caption is separate) */}
                  {openedNote.label && openedNote.message && openedNote.message !== openedNote.label && (
                    <Text style={styles.noteViewerCaption}>&ldquo;{openedNote.message}&rdquo;</Text>
                  )}
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); const target = openedNote; setOpenedNote(null); startRename(target); }}
                    style={styles.renameLink}
                    accessibilityRole="button"
                  >
                    <Text style={styles.renameLinkText}>✎ Rename</Text>
                  </TouchableOpacity>
                </>
              )}
              {openedNote.mediaType !== 'voice' && openedNote.message ? (
                <Text style={styles.noteViewerMsg}>{openedNote.message}</Text>
              ) : null}
              <Text style={styles.noteViewerHint}>Tap anywhere to close</Text>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Rename modal — long-press on a voice note in the list, OR Rename link
          from the opened viewer. Empty save clears any existing label so the
          display falls back to caption / auto-title. */}
      {renameTarget && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { gap: Spacing.md }]}>
              <Text style={styles.modalTitle}>Rename this voice note</Text>
              <Text style={styles.deleteHint}>
                Give it a name that makes it easy to find later. Leave empty to reset.
              </Text>
              <TextInput
                style={[styles.textarea, { minHeight: 48, textAlignVertical: 'center' }]}
                placeholder={voiceNoteTitle(renameTarget)}
                placeholderTextColor={Colors.muted}
                value={renameDraft}
                onChangeText={setRenameDraft}
                maxLength={80}
                autoFocus
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRenameTarget(null)} accessibilityRole="button">
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sendBtn} onPress={confirmRename} accessibilityRole="button">
                  <Text style={styles.sendText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  // Mode toggle (Text | Voice) — segmented control at top of composer for
  // new notes. Editing existing notes hides the toggle since re-recording
  // isn't supported (see noteService.updateNote).
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  modeBtnActive: { backgroundColor: Colors.burgundy },
  modeBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  modeBtnTextActive: { color: Colors.cream },
  voiceComposeWrap: { gap: Spacing.md },
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
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  noteViewer: { flex: 1, backgroundColor: 'rgba(61,26,36,0.7)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  noteViewerCard: { backgroundColor: Colors.cream, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.lg, maxWidth: 360, width: '100%' },
  noteViewerEmoji: { fontSize: 60 },
  noteViewerMsg: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text, textAlign: 'center', lineHeight: 34 },
  noteViewerTitle: { fontFamily: Fonts.headingItalic, fontSize: 20, color: Colors.burgundy, textAlign: 'center' },
  noteViewerCaption: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  renameLink: { paddingVertical: 6 },
  renameLinkText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.burgundy },
  noteViewerHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
});
