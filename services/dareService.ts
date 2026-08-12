import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

// Async Dares — one partner challenges the other to complete something by
// an optional deadline. Reviewer D3 in Aug 2026 entertainment review; fills
// the "playful challenge, distance-friendly" gap that same-room Truth or
// Dare doesn't cover.
//
// Lifecycle:
//   pending    → author sent, awaiting recipient response
//   accepted   → recipient accepted, now on their plate to complete
//   declined   → recipient said no (no shame, ends the flow)
//   completed  → recipient marked done, optionally with photo proof
//
// Author can withdraw only while status === 'pending' (before recipient
// engages). Completed dares are archived in the list but not deleted.
export interface Dare {
  id: string;
  fromUid: string;
  toUid: string;
  prompt: string;
  deadline: number | null;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: number;
  respondedAt?: number;
  completedAt?: number;
  proofURL?: string;
  proofNote?: string;
}

// Chronological list, newest first. 20 is plenty for the two tabs at MVP
// scale; older dares are still in Firestore but drop out of the visible
// window. If ever needed, expand or paginate — same trade-off pattern as
// [subscribeMoments](momentService.ts).
export function subscribeDares(coupleId: string, onChange: (dares: Dare[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'couples', coupleId, 'dares'),
    orderBy('createdAt', 'desc'),
    limit(20),
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Dare)));
  });
}

export async function createDare(
  coupleId: string,
  fromUid: string,
  toUid: string,
  prompt: string,
  deadline?: number | null,
): Promise<string> {
  const ref = await addDoc(collection(db, 'couples', coupleId, 'dares'), {
    fromUid,
    toUid,
    prompt: prompt.trim(),
    deadline: deadline ?? null,
    status: 'pending',
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function acceptDare(coupleId: string, dareId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'dares', dareId), {
    status: 'accepted',
    respondedAt: Date.now(),
  });
}

export async function declineDare(coupleId: string, dareId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'dares', dareId), {
    status: 'declined',
    respondedAt: Date.now(),
  });
}

// Optional proofURL + proofNote — recipient chooses at completion time.
// Empty string on proofNote is fine; only present fields get written.
export async function completeDare(
  coupleId: string,
  dareId: string,
  proofURL?: string,
  proofNote?: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status: 'completed',
    completedAt: Date.now(),
  };
  if (proofURL) patch.proofURL = proofURL;
  if (proofNote?.trim()) patch.proofNote = proofNote.trim();
  await updateDoc(doc(db, 'couples', coupleId, 'dares', dareId), patch);
}

// Author cancels a dare before the recipient has responded. Hard delete
// rather than status transition — a withdrawn dare shouldn't clutter the
// recipient's history or push notifications any further.
export async function withdrawDare(coupleId: string, dareId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'dares', dareId));
}
