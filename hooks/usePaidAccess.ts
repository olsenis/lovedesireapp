import { useEffect } from 'react';
import { router } from 'expo-router';
import { useSubscription } from './useSubscription';
import { trackEvent } from '../services/statsService';

// Paid-screen gate with a read view (Sep 2026, USER_VOICE A2).
//
// A paid screen gates WRITES, never the couple's own data. Pass `hasData`:
//   null  → the feature's data has not loaded yet (render nothing)
//   false → nothing to read: non-subscribers are sent to /upgrade as before
//   true  → non-subscribers get the screen in read-only mode; the screen
//           hides every write affordance and shows <PremiumEndedBanner />.
// Rationale: Cozy Couples, Evergreen and Lovewick turned five-star users
// into "cash grab" reviews by locking what people had already made
// (USER_VOICE.md §2.3). Presence and Tease keep the full gate on purpose
// (a cycle counter and 24 h media are not history worth a read view).
export function usePaidAccess(hasData: boolean | null): {
  isSubscribed: boolean;
  ready: boolean;
  readOnly: boolean;
} {
  const { isSubscribed, isLoading: subLoading } = useSubscription();
  useEffect(() => {
    if (!subLoading && !isSubscribed && hasData === false) {
      trackEvent('upgrade_cta_tapped');
      router.replace('/upgrade' as any);
    }
  }, [subLoading, isSubscribed, hasData]);
  const ready = !subLoading && (isSubscribed || hasData === true);
  const readOnly = !subLoading && !isSubscribed && hasData === true;
  return { isSubscribed, ready, readOnly };
}
