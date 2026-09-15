import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { isAppLockEnabled, setAppLockEnabled, authenticate, LOCK_AFTER_MS } from '../services/appLockService';

// One instance, mounted in app/_layout.tsx (USER_VOICE A7).
//   enabled  the device-local switch
//   locked   the app must authenticate before it shows anything
//   covered  the app is in the background or inactive: a blank cover so the
//            app switcher snapshot never shows a card, a note or a match
//            (the lock that "shows you what was on screen before it locked"
//            was Coral's one-star review)
// Lock rules: locked on cold start when enabled; locked again when the app
// comes back after more than LOCK_AFTER_MS away. A failed or cancelled
// prompt keeps it locked; the overlay's Unlock button prompts again.
export function useAppLock(): {
  enabled: boolean;
  locked: boolean;
  covered: boolean;
  unlock: () => Promise<boolean>;
  setEnabled: (on: boolean) => Promise<void>;
} {
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);
  const enabledRef = useRef(false);

  useEffect(() => {
    isAppLockEnabled().then((on) => {
      enabledRef.current = on;
      setEnabledState(on);
      if (on) setLocked(true);
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
        backgroundedAt.current = null;
        if (enabledRef.current && away > LOCK_AFTER_MS) setLocked(true);
        setCovered(false);
      } else {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
        if (enabledRef.current) setCovered(true);
      }
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback(async () => {
    if (prompting.current) return false;
    prompting.current = true;
    try {
      const ok = await authenticate('Unlock');
      if (ok) setLocked(false);
      return ok;
    } finally {
      prompting.current = false;
    }
  }, []);

  // Prompt once, on its own, when the app becomes locked while active.
  useEffect(() => {
    if (locked && AppState.currentState === 'active') {
      unlock().catch(() => {});
    }
  }, [locked, unlock]);

  const setEnabled = useCallback(async (on: boolean) => {
    await setAppLockEnabled(on);
    enabledRef.current = on;
    setEnabledState(on);
    if (!on) { setLocked(false); setCovered(false); }
  }, []);

  return { enabled, locked, covered, unlock, setEnabled };
}
