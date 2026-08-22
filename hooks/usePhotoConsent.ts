import { useState, useRef, useCallback } from 'react';
import { hasPhotoConsent, confirmPhotoConsent } from '../services/photoConsentService';

export function usePhotoConsent() {
  const [showModal, setShowModal] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  // Monotonic counter — bumped on each guard call + on cancel. After the
  // hasPhotoConsent await we compare our captured id to the current value;
  // if a newer call has bumped past us (or cancel has invalidated us), we
  // bail rather than firing a stale modal or action.
  const requestIdRef = useRef(0);

  const guardPhotoAction = useCallback(async (uid: string, action: () => void) => {
    if (!uid) return;
    const myId = ++requestIdRef.current;
    const consented = await hasPhotoConsent(uid);
    if (myId !== requestIdRef.current) return;
    if (consented) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setShowModal(true);
  }, []);

  const handleConfirm = useCallback(async (uid: string) => {
    if (!uid) return;
    await confirmPhotoConsent(uid);
    setShowModal(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, []);

  const handleCancel = useCallback(() => {
    requestIdRef.current++;
    pendingActionRef.current = null;
    setShowModal(false);
  }, []);

  return { showPhotoConsent: showModal, guardPhotoAction, handleConfirm, handleCancel };
}
