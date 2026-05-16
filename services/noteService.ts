import { collection, addDoc, updateDoc, deleteDoc, deleteField, doc, onSnapshot, orderBy, query, limit, where, getDocs, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import type { MoodEmoji } from './moodService';

export interface LoveNote {
  id: string;
  message: string;
  openAt: number;
  openCondition?: 'sad' | 'visit' | 'missing' | 'sleepless';
  // sad       = partner logs the configured mood (auto-unlock, see triggerEmoji)
  // visit     = next visit date arrives (auto-unlock, LDR)
  // missing   = LDR stash, recipient opens when missing partner (manual)
  // sleepless = LDR stash, recipient opens when can't sleep (manual)
  triggerEmoji?: MoodEmoji; // present when openCondition === 'sad'; defaults to '😢' for legacy notes
  fromUid: string;
  opened: boolean;
  createdAt: number;
}

export function subscribeNotes(coupleId: string, onChange: (notes: LoveNote[]) => void): Unsubscribe {
  // Cap at 50 most recent — old notes are rarely revisited
  const q = query(collection(db, 'couples', coupleId, 'notes'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoveNote)));
  });
}

export async function createNote(
  coupleId: string,
  fromUid: string,
  message: string,
  openAt: number,
  openCondition?: 'sad' | 'visit' | 'missing' | 'sleepless',
  triggerEmoji?: MoodEmoji,
): Promise<void> {
  // Only sad/visit are auto-unlocked — lock their openAt to year 9999 so time never triggers them.
  // missing/sleepless are stash letters openable anytime by the recipient.
  const isAutoUnlock = openCondition === 'sad' || openCondition === 'visit';
  await addDoc(collection(db, 'couples', coupleId, 'notes'), {
    message,
    openAt: isAutoUnlock ? 32503680000000 : openAt,
    ...(openCondition ? { openCondition } : {}),
    ...(triggerEmoji ? { triggerEmoji } : {}),
    fromUid,
    opened: false,
    createdAt: Date.now(),
  });
}

// Called when a user sets a mood — unlocks any pending mood-trigger notes from partner that match the chosen emoji.
// Legacy notes without triggerEmoji default to '😢' so old "sad" notes keep working.
export async function unlockMoodNotes(coupleId: string, uid: string, emoji: MoodEmoji): Promise<void> {
  const q = query(
    collection(db, 'couples', coupleId, 'notes'),
    where('openCondition', '==', 'sad'),
    where('opened', '==', false)
  );
  const snap = await getDocs(q);
  const toUnlock = snap.docs.filter((d) => {
    const data = d.data();
    if (data.fromUid === uid) return false;
    const noteEmoji: MoodEmoji = (data.triggerEmoji as MoodEmoji) ?? '😢';
    return noteEmoji === emoji;
  });
  await Promise.all(toUnlock.map((d) => updateDoc(d.ref, { openAt: Date.now() })));
}

// Legacy alias — same behavior as unlockMoodNotes('😢', ...). Kept for any old callers.
export async function unlockSadNotes(coupleId: string, uid: string): Promise<void> {
  return unlockMoodNotes(coupleId, uid, '😢');
}

// Called when the next visit date has arrived — unlocks any pending visit-condition notes from partner
export async function unlockVisitNotes(coupleId: string, uid: string): Promise<void> {
  const q = query(
    collection(db, 'couples', coupleId, 'notes'),
    where('openCondition', '==', 'visit'),
    where('opened', '==', false)
  );
  const snap = await getDocs(q);
  const toUnlock = snap.docs.filter(d => d.data().fromUid !== uid);
  await Promise.all(toUnlock.map(d =>
    updateDoc(d.ref, { openAt: Date.now() })
  ));
}

export async function openNote(coupleId: string, noteId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'notes', noteId), { opened: true });
}

export async function updateNote(
  coupleId: string,
  noteId: string,
  message: string,
  openAt: number,
  openCondition?: 'sad' | 'visit' | 'missing' | 'sleepless',
  triggerEmoji?: MoodEmoji,
): Promise<void> {
  const isAutoUnlock = openCondition === 'sad' || openCondition === 'visit';
  // deleteField() removes the property server-side when the user clears a condition or emoji
  await updateDoc(doc(db, 'couples', coupleId, 'notes', noteId), {
    message,
    openAt: isAutoUnlock ? 32503680000000 : openAt,
    openCondition: openCondition ?? deleteField(),
    triggerEmoji:  triggerEmoji  ?? deleteField(),
  });
}

export async function deleteNote(coupleId: string, noteId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'notes', noteId));
}
