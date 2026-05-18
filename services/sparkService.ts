import { collection, doc, addDoc, updateDoc, onSnapshot, query, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { awardPoints, POINTS } from './levelsService';

export interface SparkEntry {
  id: string;
  fromUid: string;
  message: string;
  emoji: string;
  createdAt: number;
  seen: boolean;
}

export const SPARK_OPTIONS: { emoji: string; message: string }[] = [
  { emoji: '❤️', message: 'Love you' },
  { emoji: '🔥', message: 'Thinking of you' },
  { emoji: '😘', message: 'Miss you' },
  { emoji: '✨', message: "You're amazing" },
  { emoji: '🤗', message: 'Sending hugs' },
];

export function subscribeRecentSparks(
  coupleId: string,
  onChange: (sparks: SparkEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'couples', coupleId, 'sparks'),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() } as SparkEntry)));
  });
}

export async function sendSpark(
  coupleId: string,
  fromUid: string,
  emoji: string,
  message: string
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'sparks'), {
    fromUid,
    message,
    emoji,
    createdAt: Date.now(),
    seen: false,
  });
  awardPoints(coupleId, POINTS.sparkSent, 'sparkSent').catch(() => {});
}

export async function markSparkSeen(coupleId: string, sparkId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'sparks', sparkId), { seen: true });
}
