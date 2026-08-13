import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export function NotAuthorized({ email }: { email: string }) {
  return (
    <div className="centered">
      <div>
        <h1 className="brand" style={{ textAlign: 'center', margin: 0 }}>Not authorized</h1>
        <p className="brand-sub" style={{ textAlign: 'center', margin: '4px 0 0' }}>Admin access only</p>
      </div>
      <div className="card-panel" style={{ textAlign: 'center', gap: 16 }}>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
          You are signed in as {email || 'this account'}, but this account is not an admin.
        </p>
        <button className="secondary-btn" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    </div>
  );
}
