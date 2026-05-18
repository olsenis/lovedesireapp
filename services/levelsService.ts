import { doc, onSnapshot, Unsubscribe, runTransaction } from 'firebase/firestore';
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

export type ActionKey = keyof typeof POINTS;

// Daily caps for "gameable" actions — anything a user can delete+recreate to
// farm points. Naturally-bounded actions (mood, questionAnswered, momentCaptured)
// don't need caps because they're rate-limited by other features (daily ritual,
// one question per day, etc.). Without these caps a user could spam-create
// notes/flashes/sparks/capsules to grind levels.
const DAILY_CAP_PER_ACTION: Partial<Record<ActionKey, number>> = {
  sparkSent: 5,        // 5 sparks per day = 5 pts ceiling
  noteSent: 3,         // 3 notes per day = 9 pts ceiling
  flashSent: 3,        // 3 flashes per day = 6 pts ceiling
  capsuleSealed: 1,    // 1 capsule per day = 8 pts ceiling
  blueprintCompleted: 1, // once per day (also naturally rare)
  pulseCompleted: 1,
  sundayCheckin: 1,
};

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
  // dailyCounts[YYYY-MM-DD] = { actionKey: count } — only today's bucket kept,
  // any other date is overwritten on next award (lazy cleanup keeps doc small).
  dailyCounts?: Record<string, Partial<Record<ActionKey, number>>>;
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

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Atomic award via transaction. Enforces daily cap per action, so users can't
// farm by repeatedly delete+create on gameable actions.
export async function awardPoints(coupleId: string, amount: number, actionKey: ActionKey): Promise<void> {
  if (amount <= 0) return;
  const ref = doc(db, 'couples', coupleId, 'meta', 'level');
  const cap = DAILY_CAP_PER_ACTION[actionKey];
  const today = todayKey();
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current: CoupleLevel = snap.exists()
      ? (snap.data() as CoupleLevel)
      : { points: 0, lastUpdated: 0 };

    // Cap check: how many of this action today already?
    const todayCounts = current.dailyCounts?.[today] ?? {};
    const todayCount = todayCounts[actionKey] ?? 0;
    if (cap !== undefined && todayCount >= cap) return; // ceiling hit, skip award

    // Lazy cleanup — only keep today's bucket
    const nextCounts: CoupleLevel['dailyCounts'] = {
      [today]: { ...todayCounts, [actionKey]: todayCount + 1 },
    };

    tx.set(ref, {
      points: current.points + amount,
      lastUpdated: Date.now(),
      dailyCounts: nextCounts,
    });
  });
}
