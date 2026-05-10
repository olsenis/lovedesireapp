import { doc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export type DateRatings = Record<string, number>; // title -> 1-5

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

export function subscribeDateRatings(
  coupleId: string,
  onChange: (ratings: DateRatings) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'couples', coupleId, 'dateRatings', 'all'), (snap) => {
    onChange(snap.exists() ? (snap.data() as DateRatings) : {});
  });
}

export async function rateDate(
  coupleId: string,
  title: string,
  rating: number
): Promise<void> {
  await setDoc(
    doc(db, 'couples', coupleId, 'dateRatings', 'all'),
    { [slugify(title)]: rating },
    { merge: true }
  );
}

export function getKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '-');
}
