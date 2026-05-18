import { useAuth } from './useAuth';

// Premium access logic.
//
// `isPremium` is the authoritative field, set by the RevenueCat webhook
// (functions/src/index.ts) when a user starts a subscription, and locked
// against client writes in firestore.rules. To grant premium to a tester
// without a real subscription (e.g. for TestFlight QA), open Firebase Console
// → Firestore → users/{uid} and set `isPremium: true` manually. The console
// uses the admin SDK and bypasses the client-side lock.
//
// We no longer hardcode admin emails behind __DEV__ — that pattern broke in
// TestFlight (where __DEV__ is false) and silently denied premium to QA
// testers, making the paywall flow impossible to verify before launch.

export interface SubscriptionState {
  isSubscribed: boolean;
  isLoading: boolean;
}

export function useSubscription(): SubscriptionState {
  const { profile, loading } = useAuth();
  const isPremium = (profile as any)?.isPremium === true;

  return {
    isSubscribed: isPremium,
    isLoading: loading,
  };
}
