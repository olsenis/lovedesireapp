import { useAuth } from './useAuth';
import { useCouple } from './useCouple';

// Premium access logic — one subscription covers both partners.
//
// Canonical field is `couples/{coupleId}/isPremium`. Written only by:
//  - RevenueCat webhook (Cloud Function admin SDK) on subscription events
//  - Firebase Console (admin SDK) for QA test couples
// Client is locked out via firestore.rules; if either partner is a member
// of a couple whose isPremium is true, both partners see the paid tier.
//
// Kept the same hook shape so all existing paywall gates
// (Fantasy Wishes / Sensate / Blueprint / Activity Cards / Intimacy Tracker
// / Fire+Desire challenge / Spicy tabs) work unchanged — they just now
// resolve to the couple's status instead of the user's.

export interface SubscriptionState {
  isSubscribed: boolean;
  isLoading: boolean;
}

export function useSubscription(): SubscriptionState {
  const { user, profile, loading: authLoading } = useAuth();
  const { couple, loading: coupleLoading } = useCouple(user?.uid, profile?.coupleId);
  // Close the transient window where profile.coupleId has arrived but the
  // couple snapshot hasn't yet. During that render, useCouple still holds
  // its previous (loading:false, couple:null) state because state from its
  // effect only lands on the NEXT render — and paid-screen guards would
  // otherwise see isLoading:false + isSubscribed:false and bounce a
  // premium couple to /upgrade before Firestore has answered.
  //
  // Deriving expectingCouple from the current profile shape (not from an
  // effect result) closes the window regardless of effect scheduling.
  // Also correctly handles unpaired users: no coupleId → expectingCouple
  // false → coupleReady true → resolves as not-subscribed as expected.
  const expectingCouple = !!profile?.coupleId;
  const coupleReady = !expectingCouple || !!couple;
  const isSubscribed = couple?.isPremium === true;
  return {
    isSubscribed,
    isLoading: authLoading || coupleLoading || !coupleReady,
  };
}
