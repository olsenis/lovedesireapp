import { collection, addDoc, doc, updateDoc, onSnapshot, orderBy, query, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface TimeCapsule {
  id: string;
  message: string;
  photoURL?: string;
  sealedAt: number;
  openAt: number; // timestamp when the capsule unlocks
  sealedBy: string; // uid
  sealedByName: string; // snapshot of name so it survives if user changes name
  opened: boolean; // partner has viewed after unlock
}

export function subscribeTimeCapsules(
  coupleId: string,
  onChange: (capsules: TimeCapsule[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'couples', coupleId, 'timeCapsules'),
    orderBy('openAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TimeCapsule)));
  });
}

export async function sealTimeCapsule(
  coupleId: string,
  sealedBy: string,
  sealedByName: string,
  message: string,
  openAt: number,
  photoURL?: string,
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'timeCapsules'), {
    message,
    sealedAt: Date.now(),
    openAt,
    sealedBy,
    sealedByName,
    opened: false,
    ...(photoURL ? { photoURL } : {}),
  });
}

export async function markCapsuleOpened(coupleId: string, capsuleId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'timeCapsules', capsuleId), { opened: true });
}

export function isUnlocked(capsule: TimeCapsule): boolean {
  return capsule.openAt <= Date.now();
}
