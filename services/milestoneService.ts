import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  arrayUnion,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export type MilestoneKind =
  | 'met'
  | 'first-date'
  | 'first-kiss'
  | 'made-it-official'
  | 'moved-in'
  | 'engaged'
  | 'married'
  | 'trip'
  | 'home'
  | 'pet'
  | 'baby'
  | 'custom';

export interface Milestone {
  id: string;
  label: string;
  date: number;       // timestamp (year/month/day)
  emoji: string;
  kind: MilestoneKind;
  note?: string;      // optional reflection
  createdBy: string;
  createdAt: number;
  // Marks a system-generated milestone. Present values are unique keys
  // like 'started-dating', 'first-presence-cycle'. Paired with
  // couple.autoMilestonesCreated: once an autoKey is in that list, the
  // corresponding milestone is never re-added even if the user deletes
  // it. Absent = user-added milestone.
  autoKey?: string;
}

export const MILESTONE_PRESETS: { kind: MilestoneKind; label: string; emoji: string }[] = [
  { kind: 'met',              label: 'We met',            emoji: '👋' },
  { kind: 'first-date',       label: 'First date',        emoji: '💑' },
  { kind: 'first-kiss',       label: 'First kiss',        emoji: '💋' },
  { kind: 'made-it-official', label: 'Made it official',  emoji: '💞' },
  { kind: 'moved-in',         label: 'Moved in together', emoji: '🏠' },
  { kind: 'engaged',          label: 'Got engaged',       emoji: '💍' },
  { kind: 'married',          label: 'Got married',       emoji: '💒' },
  { kind: 'trip',             label: 'First trip',        emoji: '✈️' },
  { kind: 'home',             label: 'Bought a home',     emoji: '🔑' },
  { kind: 'pet',              label: 'Got a pet',         emoji: '🐾' },
  { kind: 'baby',             label: 'Had a baby',        emoji: '👶' },
  { kind: 'custom',           label: 'Custom...',         emoji: '⭐' },
];

export function subscribeMilestones(
  coupleId: string,
  onChange: (entries: Milestone[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'milestones'), orderBy('date', 'asc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Milestone)));
  });
}

export async function addMilestone(
  coupleId: string,
  data: Omit<Milestone, 'id' | 'createdAt'>,
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'milestones'), {
    ...data,
    createdAt: Date.now(),
  });
}

export async function updateMilestone(
  coupleId: string,
  milestoneId: string,
  patch: Partial<Pick<Milestone, 'label' | 'date' | 'emoji' | 'kind' | 'note'>>,
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'milestones', milestoneId), patch);
}

export async function deleteMilestone(coupleId: string, milestoneId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'milestones', milestoneId));
}

// Idempotent auto-milestone creator. Reads couple.autoMilestonesCreated in
// a transaction: if autoKey is already present → no-op (milestone was
// created before, user may have since deleted it, respect that). If not →
// writes the milestone doc + appends autoKey to the tracker list. Never
// re-creates the same auto milestone once its autoKey has been recorded.
export async function ensureAutoMilestone(
  coupleId: string,
  autoKey: string,
  data: Omit<Milestone, 'id' | 'createdAt' | 'autoKey'>,
): Promise<void> {
  const coupleRef = doc(db, 'couples', coupleId);
  const milestonesRef = collection(db, 'couples', coupleId, 'milestones');
  await runTransaction(db, async (tx) => {
    const coupleSnap = await tx.get(coupleRef);
    if (!coupleSnap.exists()) return;
    const existing: string[] = (coupleSnap.data() as { autoMilestonesCreated?: string[] }).autoMilestonesCreated ?? [];
    if (existing.includes(autoKey)) return;
    // addDoc-equivalent inside a transaction: we can't addDoc, must use
    // a preallocated doc ref.
    const newMilestoneRef = doc(milestonesRef);
    tx.set(newMilestoneRef, { ...data, autoKey, createdAt: Date.now() });
    tx.update(coupleRef, { autoMilestonesCreated: arrayUnion(autoKey) });
  });
}
