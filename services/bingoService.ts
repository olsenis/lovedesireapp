import { doc, setDoc, updateDoc, arrayUnion, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { BINGO_ACTIVITIES } from '../constants/content';

export interface BingoSession {
  month: string;
  squares: string[];
  checked: number[];
  checkedBy: Record<number, string>;
  winner?: string; // 'both' when bingo achieved
  resetCount: number;
}

function monthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function generateCard(seed: string): string[] {
  let s = 0;
  for (const c of seed) s = ((s << 5) - s + c.charCodeAt(0)) | 0;
  const pool = [...BINGO_ACTIVITIES];
  for (let i = pool.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    const j = Math.abs(s) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 25);
}

function checkBingo(checked: number[]): boolean {
  const set = new Set(checked);
  for (let r = 0; r < 5; r++) {
    if ([0,1,2,3,4].every(c => set.has(r*5+c))) return true;
  }
  for (let c = 0; c < 5; c++) {
    if ([0,1,2,3,4].every(r => set.has(r*5+c))) return true;
  }
  if ([0,6,12,18,24].every(i => set.has(i))) return true;
  if ([4,8,12,16,20].every(i => set.has(i))) return true;
  return false;
}

export function subscribeBingo(coupleId: string, onChange: (s: BingoSession | null) => void): Unsubscribe {
  const month = monthKey();
  const ref = doc(db, 'couples', coupleId, 'bingo', month);
  return onSnapshot(ref, async (snap) => {
    if (snap.exists()) {
      onChange(snap.data() as BingoSession);
    } else {
      const squares = generateCard(month + coupleId + '0');
      const newSession: BingoSession = { month, squares, checked: [], checkedBy: {}, resetCount: 0 };
      await setDoc(ref, newSession);
      onChange(newSession);
    }
  });
}

export async function checkBingoSquare(coupleId: string, uid: string, index: number, session: BingoSession): Promise<void> {
  const month = monthKey();
  const newChecked = [...new Set([...session.checked, index])];
  const bingo = !session.winner && checkBingo(newChecked);
  await updateDoc(doc(db, 'couples', coupleId, 'bingo', month), {
    checked: arrayUnion(index),
    [`checkedBy.${index}`]: uid,
    ...(bingo ? { winner: 'both' } : {}),
  });
}

export async function resetBingo(coupleId: string, session: BingoSession): Promise<void> {
  const month = monthKey();
  const newReset = (session.resetCount ?? 0) + 1;
  const squares = generateCard(month + coupleId + String(newReset));
  await setDoc(doc(db, 'couples', coupleId, 'bingo', month), {
    month,
    squares,
    checked: [],
    checkedBy: {},
    winner: null,
    resetCount: newReset,
  });
}

export function hasBingo(checked: number[]): boolean {
  return checkBingo(checked);
}
