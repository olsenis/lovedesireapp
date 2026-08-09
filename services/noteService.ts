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
  // Two-query approach so the auto-unlock flow works at any couple lifetime:
  //  1. Recent 50 by createdAt desc — bounded display list for the UI
  //  2. All unopened, no limit — catches auto-unlock notes older than the
  //     50-doc window that would otherwise silently receive an openAt
  //     update and never reappear for the recipient. Unopened is a small
  //     subset in practice, and the query hits an existing index on the
  //     `opened` field.
  // Union both streams by id, sort by createdAt desc, emit combined list.
  // Previously used a single query with limit(50)-then-200 which just
  // delayed the same bug — auto-unlock on a 201st-oldest note would still
  // vanish from view.
  const recentQ = query(
    collection(db, 'couples', coupleId, 'notes'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  const unopenedQ = query(
    collection(db, 'couples', coupleId, 'notes'),
    where('opened', '==', false),
  );

  let recent: Map<string, LoveNote> = new Map();
  let unopened: Map<string, LoveNote> = new Map();
  const emit = () => {
    const merged = new Map<string, LoveNote>();
    for (const [id, note] of recent) merged.set(id, note);
    for (const [id, note] of unopened) merged.set(id, note);
    const list = Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
    onChange(list);
  };

  const unsubRecent = onSnapshot(recentQ, (snap) => {
    recent = new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as LoveNote]));
    emit();
  });
  const unsubUnopened = onSnapshot(unopenedQ, (snap) => {
    unopened = new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as LoveNote]));
    emit();
  });

  return () => {
    unsubRecent();
    unsubUnopened();
  };
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
  // Individual updates can throw "no such document" if the sender deletes a
  // note between our getDocs read and the update. That's benign — the note
  // is gone, no unlock needed. Swallow per-item errors so one missing note
  // doesn't take down the whole unlock batch and break the mood-pick flow.
  await Promise.all(toUnlock.map((d) => updateDoc(d.ref, { openAt: Date.now() }).catch(() => {})));
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
  // Swallow per-item errors — same reason as unlockMoodNotes above.
  await Promise.all(toUnlock.map(d =>
    updateDoc(d.ref, { openAt: Date.now() }).catch(() => {})
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
