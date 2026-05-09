import { collection, addDoc, onSnapshot, query, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface PulseResult {
  id: string;
  uid: string;
  scores: Record<string, number>;
  avg: number;
  createdAt: number;
}

export function subscribePulseHistory(
  coupleId: string,
  uid: string,
  onChange: (results: PulseResult[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'couples', coupleId, 'pulse'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as PulseResult));
    onChange(all.filter(r => r.uid === uid));
  });
}

export async function savePulseResult(
  coupleId: string,
  uid: string,
  scores: Record<string, number>,
  avg: number
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'pulse'), {
    uid,
    scores,
    avg,
    createdAt: Date.now(),
  });
}

export function getPulseTrend(results: PulseResult[]): 'improving' | 'declining' | 'stable' | null {
  if (results.length < 3) return null;
  const latest = results[0].avg;
  const oldest = results[2].avg;
  if (latest - oldest >= 0.5) return 'improving';
  if (oldest - latest >= 0.5) return 'declining';
  return 'stable';
}
