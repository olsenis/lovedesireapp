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
  const isSubscribed = couple?.isPremium === true;
  return {
    isSubscribed,
    // Both loads must resolve before we can trust the answer — otherwise
    // paid screens would flash for a beat before the redirect fires.
    isLoading: authLoading || coupleLoading,
  };
}
