import { collection, doc, addDoc, updateDoc, onSnapshot, query, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface FlashEntry {
  id: string;
  fromUid: string;
  mediaURL: string;
  mediaType: 'photo' | 'video' | 'voice';
  caption?: string;
  createdAt: number;
  expiresAt: number;
  viewed: boolean;
}

export function subscribeFlashes(
  coupleId: string,
  onChange: (flashes: FlashEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'couples', coupleId, 'flashes'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(q, (snap) => {
    const now = Date.now();
    const active = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as FlashEntry))
      .filter(f => f.expiresAt > now);
    onChange(active);
  });
}

export async function sendFlash(
  coupleId: string,
  fromUid: string,
  mediaURL: string,
  mediaType: 'photo' | 'video' | 'voice',
  caption?: string
): Promise<void> {
  const now = Date.now();
  await addDoc(collection(db, 'couples', coupleId, 'flashes'), {
    fromUid,
    mediaURL,
    mediaType,
    caption: caption ?? '',
    createdAt: now,
    expiresAt: now + 86400000,
    viewed: false,
  });
}

export async function markFlashViewed(coupleId: string, flashId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'flashes', flashId), { viewed: true });
}

export function formatCountdown(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
