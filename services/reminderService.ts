import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc, Unsubscribe } from 'firebase/firestore';
import { Notifications } from './notificationsGuard';
import { Platform } from 'react-native';
import { db } from './firebase';
import { trackEvent } from './statsService';

// Flirt Reminders: notes to MYSELF to do something sweet for my partner.
//
// PRIVATE since Sep 21 2026: one doc per person, users/{uid}/private/
// flirtReminders = { items: FlirtReminder[] }, under the rule that makes
// /private/{doc} strictly self-only. Until then they sat in the shared
// couples/{id}/reminders collection and the screen listed all of them, so the
// partner read "Surprise Ola with a small gesture" in her own list and could
// switch it on, which scheduled the notification on HER phone. A reminder to
// do something for someone only works if that someone never sees it. Same
// shape as sundayPlanService: one private doc holding a small list.

export interface FlirtReminder {
  id: string;
  message: string;
  time: string; // "HH:mm"
  days: number[]; // 0=Sun, 1=Mon ... 6=Sat
  active: boolean;
  createdAt: number;
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MAX_REMINDERS = 12;

// {partner} is filled with the partner's name by personalise() in the screen,
// and the filled text is what gets saved, so the notification reads "Tell Ola
// one thing you love". No pronouns and no idiom (VOICE.md).
export const REMINDER_SUGGESTIONS = [
  'Send {partner} a flirty text 💬',
  'Tell {partner} one thing you love ❤️',
  'Surprise {partner} with something small 🎁',
  'Give {partner} a long hug when you meet 🤗',
  'Send {partner} a photo that made you think of the two of you 📸',
  'Plan something fun for the weekend 🎉',
  'Leave a note where {partner} will find it 📝',
  'Give {partner} a compliment today 😍',
  "Make {partner}'s favorite drink or snack ☕",
  'Ask {partner} about the day, and really listen 👂',
];

const ref = (uid: string) => doc(db, 'users', uid, 'private', 'flirtReminders');

const clean = (raw: unknown): FlirtReminder[] =>
  Array.isArray(raw) ? (raw as FlirtReminder[]).filter((r) => r && typeof r.id === 'string' && typeof r.message === 'string') : [];

async function readItems(uid: string): Promise<FlirtReminder[]> {
  const snap = await getDoc(ref(uid));
  return clean(snap.data()?.items);
}

export function subscribeReminders(uid: string, onChange: (reminders: FlirtReminder[]) => void): Unsubscribe {
  return onSnapshot(ref(uid), (snap) => {
    onChange(clean(snap.data()?.items).sort((a, b) => a.createdAt - b.createdAt));
  }, () => onChange([]));
}

export async function addReminder(uid: string, reminder: Omit<FlirtReminder, 'id' | 'createdAt'>): Promise<FlirtReminder> {
  const createdAt = Date.now();
  // Local id: the notification identifiers are built from it, so it must be
  // known before the write and never change.
  const saved: FlirtReminder = { ...reminder, id: `r-${createdAt.toString(36)}${Math.random().toString(36).slice(2, 6)}`, createdAt };
  const items = await readItems(uid);
  await setDoc(ref(uid), { items: [...items, saved].slice(-MAX_REMINDERS) }, { merge: true });
  trackEvent('reminder_created');
  return saved;
}

export async function toggleReminder(uid: string, id: string, active: boolean): Promise<void> {
  const items = await readItems(uid);
  await setDoc(ref(uid), { items: items.map((r) => (r.id === id ? { ...r, active } : r)) }, { merge: true });
}

export async function deleteReminder(uid: string, id: string): Promise<void> {
  const items = await readItems(uid);
  await setDoc(ref(uid), { items: items.filter((r) => r.id !== id) }, { merge: true });
}

// One time, per person: bring MY reminders over from the shared collection,
// KEEPING their ids so notifications already scheduled on this phone can still
// be switched off, then delete them there. The partner's reminders are left
// for the partner's own migration. Does nothing once the private doc exists.
export async function migrateLegacyReminders(uid: string, coupleId: string | undefined | null): Promise<void> {
  const mine = await getDoc(ref(uid));
  if (mine.exists()) return;
  let legacy: FlirtReminder[] = [];
  if (coupleId) {
    const snap = await getDocs(collection(db, 'couples', coupleId, 'reminders'));
    const own = snap.docs.filter((d) => d.data().createdBy === uid);
    legacy = own.map((d) => {
      const x = d.data();
      return { id: d.id, message: String(x.message ?? ''), time: String(x.time ?? '09:00'), days: Array.isArray(x.days) ? x.days : [], active: x.active !== false, createdAt: Number(x.createdAt ?? Date.now()) };
    }).filter((r) => r.message);
    await setDoc(ref(uid), { items: legacy.slice(-MAX_REMINDERS) });
    await Promise.all(own.map((d) => deleteDoc(d.ref).catch(() => {})));
    return;
  }
  await setDoc(ref(uid), { items: legacy });
}

// ─── Local notification scheduling ───────────────────────────────────────────

function notifIdForDay(reminderId: string, day: number): string {
  return `reminder-${reminderId}-day${day}`;
}

export async function scheduleReminderNotifications(reminder: FlirtReminder): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!Notifications) return;
  await cancelReminderNotifications(reminder.id);
  if (!reminder.active) return;
  const [hour, minute] = reminder.time.split(':').map(Number);
  for (const day of reminder.days) {
    await Notifications.scheduleNotificationAsync({
      identifier: notifIdForDay(reminder.id, day),
      content: {
        title: 'Love Desire 💝',
        body: reminder.message,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour, minute },
    });
  }
}

export async function cancelReminderNotifications(reminderId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!Notifications) return;
  for (let day = 0; day < 7; day++) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notifIdForDay(reminderId, day));
    } catch { /* already cancelled */ }
  }
}
