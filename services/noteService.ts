import { collection, addDoc, updateDoc, doc, onSnapshot, orderBy, query, limit, where, getDocs, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface LoveNote {
  id: string;
  message: string;
  openAt: number;
  openCondition?: 'sad' | 'visit' | 'missing' | 'sleepless';
  // sad      = partner sets sad mood (auto-unlock)
  // visit    = next visit date arrives (auto-unlock)
  // missing  = LDR stash, recipient opens when missing partner (manual)
  // sleepless = LDR stash, recipient opens when can't sleep (manual)
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
  openCondition?: 'sad' | 'visit' | 'missing' | 'sleepless'
): Promise<void> {
  // Only sad/visit are auto-unlocked — lock their openAt to year 9999 so time never triggers them.
  // missing/sleepless are stash letters openable anytime by the recipient.
  const isAutoUnlock = openCondition === 'sad' || openCondition === 'visit';
  await addDoc(collection(db, 'couples', coupleId, 'notes'), {
    message,
    openAt: isAutoUnlock ? 32503680000000 : openAt,
    ...(openCondition ? { openCondition } : {}),
    fromUid,
    opened: false,
    createdAt: Date.now(),
  });
}

// Called when a user sets their mood to sad — unlocks any pending sad-condition notes from partner
export async function unlockSadNotes(coupleId: string, uid: string): Promise<void> {
  const q = query(
    collection(db, 'couples', coupleId, 'notes'),
    where('openCondition', '==', 'sad'),
    where('opened', '==', false)
  );
  const snap = await getDocs(q);
  const toUnlock = snap.docs.filter(d => d.data().fromUid !== uid);
  await Promise.all(toUnlock.map(d =>
    updateDoc(d.ref, { openAt: Date.now() })
  ));
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
