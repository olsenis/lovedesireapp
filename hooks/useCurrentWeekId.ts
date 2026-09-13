import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getCurrentWeekId } from '../services/stateUnionService';

// ISO week id that follows the clock. The screens used to memoise
// getCurrentWeekId() at mount, so a phone left open across Sunday night
// kept writing to the old week (Review #11 B13). Re-checks when the app
// returns to the foreground and once a minute; the value only changes on
// a real rollover, so subscribers keyed on it do not churn.
export function useCurrentWeekId(): string {
  const [weekId, setWeekId] = useState<string>(() => getCurrentWeekId());
  useEffect(() => {
    const check = () => {
      const now = getCurrentWeekId();
      setWeekId((prev) => (prev === now ? prev : now));
    };
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    const interval = setInterval(check, 60000);
    return () => { sub.remove(); clearInterval(interval); };
  }, []);
  return weekId;
}
