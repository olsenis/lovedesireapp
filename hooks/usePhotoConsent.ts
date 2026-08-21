import { useState, useRef, useCallback } from 'react';
import { hasPhotoConsent, confirmPhotoConsent } from '../services/photoConsentService';

export function usePhotoConsent() {
  const [showModal, setShowModal] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const guardPhotoAction = useCallback(async (uid: string, action: () => void) => {
    if (!uid) return;
    const consented = await hasPhotoConsent(uid);
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
    pendingActionRef.current = null;
    setShowModal(false);
  }, []);

  return { showPhotoConsent: showModal, guardPhotoAction, handleConfirm, handleCancel };
}
