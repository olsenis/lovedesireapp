import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { hasSpicyConsentToday, markSpicyConsentToday, spicyConsentCopy, SpicyConsentMode } from '../services/spicyConsentService';
import { trackEvent } from '../services/statsService';

// Gate for explicit surfaces. Usage:
//   const { spicyOk, requireSpicyConsent, spicyGate } = useSpicyConsent(uid);
//   ... in a handler: if (!spicyOk) { requireSpicyConsent('joint', () => proceed()); return; }
//   ... in render: {spicyGate}
// `spicyOk` is null until storage has been read, then true/false for today.
export function useSpicyConsent(uid: string) {
  const [spicyOk, setSpicyOk] = useState<boolean | null>(null);
  const [pending, setPending] = useState<{ mode: SpicyConsentMode; onProceed: () => void; onDecline?: () => void } | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!uid) { setSpicyOk(null); return; }
    hasSpicyConsentToday(uid).then((ok) => { if (mounted.current) setSpicyOk(ok); });
    return () => { mounted.current = false; };
  }, [uid]);

  const requireSpicyConsent = useCallback((mode: SpicyConsentMode, onProceed: () => void, onDecline?: () => void) => {
    if (spicyOk) { onProceed(); return; }
    setPending({ mode, onProceed, onDecline });
  }, [spicyOk]);

  const copy = spicyConsentCopy(pending?.mode ?? 'solo');
  const spicyGate = (
    <ConfirmModal
      visible={!!pending}
      title={copy.title}
      message={copy.message}
      confirmLabel={copy.confirmLabel}
      cancelLabel={copy.cancelLabel}
      onConfirm={async () => {
        const p = pending; setPending(null);
        if (uid) await markSpicyConsentToday(uid);
        setSpicyOk(true);
        trackEvent(`spicy_consent_${p?.mode ?? 'solo'}`);
        p?.onProceed();
      }}
      onCancel={() => {
        const p = pending; setPending(null);
        p?.onDecline?.();
      }}
    />
  );

  return { spicyOk, requireSpicyConsent, spicyGate };
}
