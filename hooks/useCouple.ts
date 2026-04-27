import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Couple } from '../services/coupleService';
import { UserProfile } from '../services/authService';

interface CoupleState {
  couple: Couple | null;
  partner: UserProfile | null;
  loading: boolean;
}

export function useCouple(myUid: string | null | undefined, coupleId: string | null | undefined): CoupleState {
  const [state, setState] = useState<CoupleState>({
    couple: null,
    partner: null,
    loading: true,
  });

  useEffect(() => {
    if (!coupleId) {
      setState({ couple: null, partner: null, loading: false });
      return;
    }

    let seq = 0;

    const unsubscribe = onSnapshot(doc(db, 'couples', coupleId), async (snap) => {
      const thisSeq = ++seq;

      if (!snap.exists()) {
        if (seq === thisSeq) setState({ couple: null, partner: null, loading: false });
        return;
      }

      const couple = { id: snap.id, ...snap.data() } as Couple;
      const partnerUid = couple.partner1Uid === myUid ? couple.partner2Uid : couple.partner1Uid;

      let partner: UserProfile | null = null;
      if (partnerUid) {
        const partnerSnap = await getDoc(doc(db, 'users', partnerUid));
        if (seq === thisSeq && partnerSnap.exists()) {
          partner = partnerSnap.data() as UserProfile;
        }
      }

      if (seq === thisSeq) setState({ couple, partner, loading: false });
    });

    return unsubscribe;
  }, [coupleId, myUid]);

  return state;
}
