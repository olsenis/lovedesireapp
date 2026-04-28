import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getHelpState, markFeatureSeen, disableAllHelp } from '../services/helpService';

export function useHelp(featureKey: string) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    getHelpState(user.uid).then((state) => {
      if (state.enabled && !state.seen.includes(featureKey)) {
        setVisible(true);
      }
    });
  }, [user, featureKey]);

  const dismiss = async () => {
    setVisible(false);
    if (user) await markFeatureSeen(user.uid, featureKey);
  };

  const dismissAll = async () => {
    setVisible(false);
    if (user) await disableAllHelp(user.uid);
  };

  return { visible, dismiss, dismissAll };
}
