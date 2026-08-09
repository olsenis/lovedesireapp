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

    // Reset to loading whenever coupleId changes (e.g. profile arrives after
    // mount). Without this, a component using useSubscription can briefly
    // see loading:false + couple:null (stale from prior run) and treat a
    // premium user as non-subscribed — triggering an incorrect /upgrade
    // redirect during the tiny window between coupleId becoming available
    // and the snapshot resolving.
    setState((s) => ({ ...s, loading: true }));

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
        try {
          const partnerSnap = await getDoc(doc(db, 'users', partnerUid));
          if (seq === thisSeq && partnerSnap.exists()) {
            partner = partnerSnap.data() as UserProfile;
          }
        } catch {
          // Partner profile unreadable — still set couple state so isConnected works
        }
      }

      if (seq === thisSeq) setState({ couple, partner, loading: false });
    });

    return unsubscribe;
  }, [coupleId, myUid]);

  return state;
}
