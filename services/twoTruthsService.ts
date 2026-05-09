import { doc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { DareLevel } from '../constants/content';

export type TTLPhase = 'writing' | 'guessing' | 'result';

export interface TwoTruthsSession {
  writerUid: string;
  phase: TTLPhase;
  statements: string[];
  lieIndex: number;
  guessIndex?: number;
  round: number;
  scores: Record<string, number>;
  dare?: string;
  dareLevel: DareLevel;
}

export function subscribeTwoTruths(
  coupleId: string,
  onChange: (s: TwoTruthsSession | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'couples', coupleId, 'twoTruths', 'active'), (snap) => {
    onChange(snap.exists() ? (snap.data() as TwoTruthsSession) : null);
  });
}

export async function startTwoTruths(
  coupleId: string,
  writerUid: string,
  dareLevel: DareLevel
): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'twoTruths', 'active'), {
    writerUid,
    phase: 'writing',
    statements: [],
    lieIndex: -1,
    round: 1,
    scores: {},
    dareLevel,
  });
}

export async function submitStatements(
  coupleId: string,
  statements: string[],
  lieIndex: number
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'twoTruths', 'active'), {
    statements,
    lieIndex,
    phase: 'guessing',
  });
}

export async function submitGuess(
  coupleId: string,
  guessIndex: number,
  dare: string
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'twoTruths', 'active'), {
    guessIndex,
    dare,
    phase: 'result',
  });
}

export async function nextRound(
  coupleId: string,
  session: TwoTruthsSession,
  uid: string,
  partnerId: string
): Promise<void> {
  const correct = session.guessIndex === session.lieIndex;
  const guessUid = session.writerUid === uid ? partnerId : uid;
  const scoredUid = correct ? session.writerUid : guessUid;
  const nextWriterUid = guessUid; // guesser becomes writer next round
  await updateDoc(doc(db, 'couples', coupleId, 'twoTruths', 'active'), {
    writerUid: nextWriterUid,
    phase: 'writing',
    statements: [],
    lieIndex: -1,
    guessIndex: undefined,
    dare: undefined,
    round: session.round + 1,
    [`scores.${scoredUid}`]: (session.scores[scoredUid] ?? 0) + 1,
  });
}

export async function resetTwoTruths(coupleId: string): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'twoTruths', 'active'), {
    writerUid: '',
    phase: 'writing',
    statements: [],
    lieIndex: -1,
    round: 0,
    scores: {},
    dareLevel: 'flirty',
  });
}
