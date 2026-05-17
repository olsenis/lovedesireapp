import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
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
