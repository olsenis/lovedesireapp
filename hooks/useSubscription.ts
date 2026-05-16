import { useAuth } from './useAuth';

// Dev-only override: certain test accounts always get premium access.
// __DEV__ is true in Expo Dev/Expo Go and false in production EAS builds,
// so these emails are stripped from prod bundles. Keep this list short.
const ADMIN_EMAILS: string[] = __DEV__ ? [
  'olsenis@gmail.com',
  'evadissigrunardottir@gmail.com',
] : [];

export interface SubscriptionState {
  isSubscribed: boolean;
  isLoading: boolean;
}

export function useSubscription(): SubscriptionState {
  const { user, profile, loading } = useAuth();

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);
  const isPremium = isAdmin || (profile as any)?.isPremium === true;

  return {
    isSubscribed: isPremium,
    isLoading: loading,
  };
}
