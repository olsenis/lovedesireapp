import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { trackEvent } from './statsService';

// App Store / Play rating prompt (Sep 2026, MARKETING §2.9).
//
// Apple shows the native sheet at most 3 times per 365 days per device,
// so every ask has to land on a moment that just went well. We never ask
// on Home, on open, or after a paywall; only right after a happy moment.
//
// Gates, all per device (AsyncStorage): at least MIN_DAYS_SINCE_INSTALL
// since the first authenticated open, at least MIN_RITUALS happy moments
// seen, and at least MIN_DAYS_BETWEEN_ASKS since the last ask. The count
// keeps growing after an ask so the next one is still gated on time.
// In Expo Go requestReview() is a no-op; on device it shows the sheet.

export type HappyMoment = 'fw_match' | 'sunday_reveal' | 'memory_lane_score' | 'challenge_complete';

const KEY_FIRST_OPEN = 'review_first_open_at';
const KEY_RITUALS = 'review_rituals_done';
const KEY_LAST_ASK = 'review_last_asked_at';

export const REVIEW_MIN_DAYS_SINCE_INSTALL = 7;
export const REVIEW_MIN_RITUALS = 3;
export const REVIEW_MIN_DAYS_BETWEEN_ASKS = 90;
const DAY = 86400000;
// Let the happy UI (match toast, score card, reveal) paint before the
// system sheet slides over it.
const ASK_DELAY_MS = 1800;

// Call once per authenticated session; only the first call ever writes.
export async function noteFirstOpen(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(KEY_FIRST_OPEN);
    if (!existing) await AsyncStorage.setItem(KEY_FIRST_OPEN, String(Date.now()));
  } catch {
    // Storage unavailable: the prompt simply never fires on this device.
  }
}

// Records a happy moment and asks for a rating if every gate passes.
// Never throws; callers fire-and-forget.
export async function noteHappyMoment(moment: HappyMoment): Promise<void> {
  try {
    const now = Date.now();
    const [firstOpenRaw, ritualsRaw, lastAskRaw] = await Promise.all([
      AsyncStorage.getItem(KEY_FIRST_OPEN),
      AsyncStorage.getItem(KEY_RITUALS),
      AsyncStorage.getItem(KEY_LAST_ASK),
    ]);
    const rituals = (Number(ritualsRaw) || 0) + 1;
    await AsyncStorage.setItem(KEY_RITUALS, String(rituals));

    const firstOpen = Number(firstOpenRaw) || 0;
    if (!firstOpen) { await AsyncStorage.setItem(KEY_FIRST_OPEN, String(now)); return; }
    if (now - firstOpen < REVIEW_MIN_DAYS_SINCE_INSTALL * DAY) return;
    if (rituals < REVIEW_MIN_RITUALS) return;
    const lastAsk = Number(lastAskRaw) || 0;
    if (lastAsk && now - lastAsk < REVIEW_MIN_DAYS_BETWEEN_ASKS * DAY) return;
    if (!(await StoreReview.isAvailableAsync())) return;

    // Stamp before asking so a crash or a second happy moment in the same
    // session cannot double-ask.
    await AsyncStorage.setItem(KEY_LAST_ASK, String(now));
    trackEvent(`review_prompted_${moment}`);
    setTimeout(() => { StoreReview.requestReview().catch(() => {}); }, ASK_DELAY_MS);
  } catch {
    // Silent: a rating prompt must never affect app behaviour.
  }
}
