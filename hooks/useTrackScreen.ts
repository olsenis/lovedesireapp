import { useEffect, useRef } from 'react';
import { trackScreen } from '../services/statsService';
import { writeSession } from '../services/telemetryService';
import { useAuth } from './useAuth';

/**
 * Track a screen mount + unmount. On mount, increment the aggregate open
 * counter (screen_{name}). On unmount, write a per-couple session record
 * (Layer 2 telemetry) and increment aggregate time counters (Layer 1) —
 * both via telemetryService, both fire-and-forget with silent catch.
 *
 * Sessions shorter than 3 seconds or with no couple paired are skipped.
 * See ADMIN_DASHBOARD.md for the full session data model.
 */
export function useTrackScreen(name: string): void {
  const { profile } = useAuth();

  // coupleId can update mid-mount (e.g. pairing completes on the same
  // screen). Read the freshest value at unmount time via a ref.
  const coupleIdRef = useRef<string | undefined>(profile?.coupleId);
  coupleIdRef.current = profile?.coupleId;

  useEffect(() => {
    trackScreen(name);
    const startedAt = Date.now();

    return () => {
      const durationSec = (Date.now() - startedAt) / 1000;
      const coupleId = coupleIdRef.current;
      if (coupleId) {
        writeSession(coupleId, name, startedAt, durationSec);
      }
    };
    // Intentionally empty deps — fire once per mount, cleanup once per
    // unmount. Screen name is stable across a screen's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
