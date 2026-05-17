import { doc, setDoc, onSnapshot, Unsubscribe, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

// Couples earn points for shared interactions. Level is computed from cumulative points.
// Points awarded per action (kept intentionally small so progression is paced):
export const POINTS = {
  mood: 1,
  questionAnswered: 2,
  questionStreakDay: 5, // both partners answered same day
  sparkSent: 1,
  noteSent: 3,
  noteOpened: 2,
  momentCaptured: 3,
  momentStreakDay: 5,
  challengeDay: 4,
  flashSent: 2,
  pulseCompleted: 5,
  blueprintCompleted: 10,
  capsuleSealed: 8,
  sundayCheckin: 6,
} as const;

export type LevelKey = 'spark' | 'glow' | 'warm' | 'bond' | 'eternal';

export interface LevelTier {
  key: LevelKey;
  label: string;
  emoji: string;
  min: number;
  max: number; // exclusive upper bound; Number.POSITIVE_INFINITY for top
  description: string;
}

export const LEVELS: LevelTier[] = [
  { key: 'spark',   label: 'Spark',   emoji: '✨', min: 0,    max: 100,  description: 'Something new is starting' },
  { key: 'glow',    label: 'Glow',    emoji: '🌸', min: 100,  max: 500,  description: 'You are finding your rhythm' },
  { key: 'warm',    label: 'Warm',    emoji: '🔥', min: 500,  max: 2000, description: 'A steady, settled closeness' },
  { key: 'bond',    label: 'Bond',    emoji: '💖', min: 2000, max: 5000, description: 'Deeply woven into each other' },
  { key: 'eternal', label: 'Eternal', emoji: '♾️', min: 5000, max: Number.POSITIVE_INFINITY, description: 'A love built to last' },
];

export interface CoupleLevel {
  points: number;
  lastUpdated: number;
}

export function getTier(points: number): LevelTier {
  return LEVELS.find(t => points >= t.min && points < t.max) ?? LEVELS[0];
}

export function getNextTier(points: number): LevelTier | null {
  const idx = LEVELS.findIndex(t => points >= t.min && points < t.max);
  if (idx < 0 || idx >= LEVELS.length - 1) return null;
  return LEVELS[idx + 1];
}

export function progressToNext(points: number): number {
  const tier = getTier(points);
  if (!isFinite(tier.max)) return 1;
  return (points - tier.min) / (tier.max - tier.min);
}

export function subscribeLevel(coupleId: string, onChange: (level: CoupleLevel) => void): Unsubscribe {
  return onSnapshot(doc(db, 'couples', coupleId, 'meta', 'level'), (snap) => {
    if (snap.exists()) onChange(snap.data() as CoupleLevel);
    else onChange({ points: 0, lastUpdated: 0 });
  });
}

// Atomic increment via transaction — multiple actions firing at once can't lose updates.
export async function awardPoints(coupleId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const ref = doc(db, 'couples', coupleId, 'meta', 'level');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data() as CoupleLevel) : { points: 0, lastUpdated: 0 };
    tx.set(ref, { points: current.points + amount, lastUpdated: Date.now() });
  });
}
