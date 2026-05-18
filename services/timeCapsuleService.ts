import { collection, addDoc, doc, getDoc, updateDoc, setDoc, onSnapshot, orderBy, query, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

// Time Capsules are split into two docs for security:
//   couples/{coupleId}/timeCapsules/{id}          metadata, both partners can always read
//   couples/{coupleId}/timeCapsules/{id}/sealed/data  content, only sealer or after openAt
// See firestore.rules — partner cannot peek at message/photoURL before openAt.

export interface TimeCapsule {
  id: string;
  sealedAt: number;
  openAt: number;
  sealedBy: string;
  sealedByName: string;
  opened: boolean;
  hasPhoto: boolean;
}

export interface TimeCapsuleContent {
  message: string;
  photoURL?: string;
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
  // 1) Create metadata doc — both partners can read this immediately
  const metadataRef = await addDoc(collection(db, 'couples', coupleId, 'timeCapsules'), {
    sealedAt: Date.now(),
    openAt,
    sealedBy,
    sealedByName,
    opened: false,
    hasPhoto: !!photoURL,
  });
  // 2) Write content to a sealed subdoc — rules deny partner read until openAt
  await setDoc(doc(db, 'couples', coupleId, 'timeCapsules', metadataRef.id, 'sealed', 'data'), {
    message,
    ...(photoURL ? { photoURL } : {}),
  });
}

export async function getCapsuleContent(coupleId: string, capsuleId: string): Promise<TimeCapsuleContent | null> {
  const snap = await getDoc(doc(db, 'couples', coupleId, 'timeCapsules', capsuleId, 'sealed', 'data'));
  if (!snap.exists()) return null;
  return snap.data() as TimeCapsuleContent;
}

export async function markCapsuleOpened(coupleId: string, capsuleId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'timeCapsules', capsuleId), { opened: true });
}

export function isUnlocked(capsule: TimeCapsule): boolean {
  return capsule.openAt <= Date.now();
}
