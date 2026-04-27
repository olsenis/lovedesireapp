import { doc, getDoc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { ChallengeProgram } from '../constants/content';

export interface ChallengeState {
  program: ChallengeProgram;
  currentDay: number;
  completedDays: number[];
  startedAt: number;
  completedBy: Record<number, string[]>; // day -> [uid, uid]
}

export function subscribeChallenge(coupleId: string, onChange: (state: ChallengeState | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'couples', coupleId, 'challenge', 'active'), (snap) => {
    onChange(snap.exists() ? (snap.data() as ChallengeState) : null);
  });
}

export async function startChallenge(coupleId: string, program: ChallengeProgram): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'challenge', 'active'), {
    program,
    currentDay: 1,
    completedDays: [],
    startedAt: Date.now(),
    completedBy: {},
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

export async function resetChallenge(coupleId: string): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'challenge', 'active'), {
    program: null,
    currentDay: 1,
    completedDays: [],
    startedAt: Date.now(),
    completedBy: {},
  });
}
