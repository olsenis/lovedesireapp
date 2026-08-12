import { useEffect } from 'react';
import { trackScreen } from '../services/statsService';

/**
 * Fire trackScreen(name) once when the component mounts. Fire-and-forget —
 * the underlying stats write silently swallows any failure so mounting a
 * screen never blocks on this.
 *
 * Use once per top-level route file. Argument is the screen slug (no
 * `screen_` prefix — the service prepends it automatically).
 */
export function useTrackScreen(name: string): void {
  useEffect(() => {
    trackScreen(name);
    // Intentionally empty deps — fire once per mount, no re-fires on
    // re-render (same session, same screen).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
