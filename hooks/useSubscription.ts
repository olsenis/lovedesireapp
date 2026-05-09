import { useAuth } from './useAuth';

// Add admin emails here — these always get premium access for testing
const ADMIN_EMAILS: string[] = [
  'olsenis@gmail.com',
  'evadissigrunardottir@gmail.com',
];

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
