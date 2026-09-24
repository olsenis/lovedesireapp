import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Notifications } from './notificationsGuard';
import { APP_NAME } from '../constants/app';

// "Remind me" on a Special Day (Sep 24 2026). Two local notifications on THIS
// phone for the next occurrence: a week before and on the day, both at 09:00.
// The choice is per phone (AsyncStorage, like the app lock and the Spicy
// consent): each partner decides for their own phone and nothing is written
// to Firestore. Until this, Special Days held the dates and never reminded
// anyone.
//
// Known limit: DATE triggers fire once. The screen books the next occurrence
// every time its ledger is computed, so a phone that never opens Special Days
// again stops after the next occurrence. Home does not compute the ledger, so
// nothing reschedules from there for now.

const KEY = 'specialDayReminders';
const HOUR = 9;
export const DAYS_BEFORE = 7;

export interface SpecialDayReminderTarget {
  key: string;      // the ledger key: 'auto-anniversary', 'user-{id}', ...
  label: string;    // as the screen shows it (a partner's secret date keeps its placeholder)
  next: Date;       // next occurrence, local midnight
}

export async function getSpecialDayReminders(): Promise<Record<string, true>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function setSpecialDayReminder(key: string, on: boolean): Promise<Record<string, true>> {
  const prefs = await getSpecialDayReminders();
  if (on) prefs[key] = true; else delete prefs[key];
  try { await AsyncStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* keep going */ }
  return prefs;
}

const ids = (key: string) => [`sday-${key}-${DAYS_BEFORE}`, `sday-${key}-0`];

async function cancelFor(key: string): Promise<void> {
  if (!Notifications) return;
  for (const id of ids(key)) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* not scheduled */ }
  }
}

// Cancels both notifications for every target and books them again for the
// ones switched on. Called with the whole ledger whenever it is computed.
export async function rescheduleSpecialDayReminders(targets: SpecialDayReminderTarget[], prefs: Record<string, true>): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  const now = Date.now();
  for (const t of targets) {
    await cancelFor(t.key);
    if (!prefs[t.key]) continue;
    const onDay = new Date(t.next); onDay.setHours(HOUR, 0, 0, 0);
    const before = new Date(onDay); before.setDate(before.getDate() - DAYS_BEFORE);
    const plan: Array<[string, Date, string]> = [
      [ids(t.key)[0], before, `${t.label} is in a week`],
      [ids(t.key)[1], onDay, `${t.label} is today 💝`],
    ];
    for (const [id, when, body] of plan) {
      if (when.getTime() <= now) continue;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: { title: APP_NAME, body, sound: true },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
        });
      } catch { /* permission denied or unsupported: the switch still saves */ }
    }
  }
}

// A deleted date takes its preference and its notifications with it.
export async function clearSpecialDayReminder(key: string): Promise<void> {
  await setSpecialDayReminder(key, false);
  if (Platform.OS !== 'web') await cancelFor(key);
}
