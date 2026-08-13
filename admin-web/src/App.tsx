import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { isCurrentUserAdmin } from './adminService';
import { LoginScreen } from './screens/LoginScreen';
import { NotAuthorized } from './screens/NotAuthorized';
import { AdminScreen } from './screens/AdminScreen';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="centered">
        <p className="brand-sub">Loading…</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  if (!isCurrentUserAdmin(user.uid)) return <NotAuthorized email={user.email ?? ''} />;
  return <AdminScreen />;
}
