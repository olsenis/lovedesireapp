import { doc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { ChallengeProgram } from '../constants/content';

export interface ChallengeState {
  program: ChallengeProgram | null;
  phase: 'setup' | 'active';
  currentDay: number;
  completedDays: number[];
  startedAt: number;
  completedBy: Record<number, string[]>;
  customTasks: Record<number, string>;   // day -> custom text (overrides default)
  editsUsed: Record<string, number>;     // uid -> edits used (max 2 per person)
  vetoesUsed: Record<string, number>;    // uid -> vetoes used (max 2 per person)
}

export const MAX_EDITS = 2;
export const MAX_VETOES = 2;

export function subscribeChallenge(coupleId: string, onChange: (state: ChallengeState | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'couples', coupleId, 'challenge', 'active'), (snap) => {
    onChange(snap.exists() ? (snap.data() as ChallengeState) : null);
  });
}

// Start enters setup phase first so partners can edit days
export async function startChallenge(coupleId: string, program: ChallengeProgram): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'challenge', 'active'), {
    program,
    phase: 'setup',
    currentDay: 1,
    completedDays: [],
    startedAt: Date.now(),
    completedBy: {},
    customTasks: {},
    editsUsed: {},
    vetoesUsed: {},
  });
}

// Move from setup to active, anyone can trigger this
export async function activateChallenge(coupleId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'challenge', 'active'), { phase: 'active' });
}

// Edit a day's task during setup phase
export async function editTask(
  coupleId: string,
  day: number,
  uid: string,
  text: string,
  state: ChallengeState
): Promise<void> {
  const used = state.editsUsed[uid] ?? 0;
  if (used >= MAX_EDITS) return;
  await updateDoc(doc(db, 'couples', coupleId, 'challenge', 'active'), {
    [`customTasks.${day}`]: text,
    [`editsUsed.${uid}`]: used + 1,
  });
}

export async function markDayComplete(coupleId: string, uid: string, day: number, state: ChallengeState): Promise<void> {
  const already = state.completedBy[day] ?? [];
  if (already.includes(uid)) return;

  const updatedBy = { ...state.completedBy, [day]: [...already, uid] };
  const bothDone = updatedBy[day].length >= 2;
  const newCompleted = bothDone && !state.completedDays.includes(day)
    ? [...state.completedDays, day]
    : state.completedDays;
  const nextDay = bothDone && state.currentDay === day
    ? Math.min(day + 1, 30)
    : state.currentDay;

  await updateDoc(doc(db, 'couples', coupleId, 'challenge', 'active'), {
    completedBy: updatedBy,
    completedDays: newCompleted,
    currentDay: nextDay,
  });
}

// Veto skips the current day for both partners automatically
export async function vetoDay(coupleId: string, uid: string, state: ChallengeState): Promise<void> {
  const used = state.vetoesUsed[uid] ?? 0;
  if (used >= MAX_VETOES) return;

  const day = state.currentDay;
  const updatedBy = { ...state.completedBy, [day]: [uid, `veto:${uid}`] };
  const newCompleted = !state.completedDays.includes(day)
    ? [...state.completedDays, day]
    : state.completedDays;
  const nextDay = Math.min(day + 1, 30);

  await updateDoc(doc(db, 'couples', coupleId, 'challenge', 'active'), {
    completedBy: updatedBy,
    completedDays: newCompleted,
    currentDay: nextDay,
    [`customTasks.${day}`]: '🎲 Free day, just have sex however you like.',
    [`vetoesUsed.${uid}`]: used + 1,
  });
}

export async function resetChallenge(coupleId: string): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'challenge', 'active'), {
    program: null,
    phase: 'setup',
    currentDay: 1,
    completedDays: [],
    startedAt: Date.now(),
    completedBy: {},
    customTasks: {},
    editsUsed: {},
    vetoesUsed: {},
  });
}
