import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../services/authService';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      } else {
        // A new user just signed in. Reset profile to null AND flip loading
        // back to true — the Firestore snapshot for their doc hasn't arrived
        // yet, and any downstream code that checks profile?.name / coupleId
        // must wait rather than route based on stale data (previously routed
        // fully-set-up users to /onboarding on every sign-back-in).
        setProfile(null);
        setLoading(true);
      }
    });
    return unsubscribeAuth;
  }, []);

  // Real-time profile listener, updates when coupleId or name changes.
  // Setting loading=false here is the only place downstream effects wake up,
  // so profile is guaranteed to reflect the current auth session by then.
  useEffect(() => {
    if (!user) return;
    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      setLoading(false);
    });
    return unsubscribeProfile;
  }, [user]);

  return { user, profile, loading };
}
