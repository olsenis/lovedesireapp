import AsyncStorage from '@react-native-async-storage/async-storage';

// Spicy session consent (Sep 2026, borrowed from koopla's pre-game
// consent screen; COMPETITORS.md). On top of the one-time 18+ attestation
// at signup, every explicit surface asks once per day, per person, per
// device: "we both want this tonight". Purely a ritual and a safety
// moment, so it lives in AsyncStorage, not Firestore. In one-phone mode
// (Truth or Dare "Together Right Here") the copy addresses both partners
// on the shared screen; on two-phone and solo surfaces (Wherever You Are,
// Fantasy Wishes) each phone asks its own user.

const PREFIX = 'spicy_consent_';

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function hasSpicyConsentToday(uid: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREFIX + uid)) === dayKey();
  } catch {
    return false;
  }
}

export async function markSpicyConsentToday(uid: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + uid, dayKey());
  } catch {
    // Storage unavailable: the gate simply asks again next time.
  }
}

export type SpicyConsentMode = 'joint' | 'solo';

export function spicyConsentCopy(mode: SpicyConsentMode): { title: string; message: string; confirmLabel: string; cancelLabel: string } {
  if (mode === 'joint') {
    return {
      title: 'Before Spicy, both of you',
      message: 'This deck is explicit. Play only what you both want, skip anything, stop any time, no questions asked.',
      confirmLabel: "We're both in",
      cancelLabel: 'Not tonight',
    };
  }
  return {
    title: 'Before Spicy',
    message: 'This is the explicit tier. Play and vote only what you truly want. Nothing is ever revealed without a mutual yes, and you can stop any time.',
    confirmLabel: "I'm in",
    cancelLabel: 'Not tonight',
  };
}
