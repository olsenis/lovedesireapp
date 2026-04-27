import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from './firebase';

export interface FlirtReminder {
  id: string;
  message: string;
  time: string; // "HH:mm"
  days: number[]; // 0=Sun, 1=Mon ... 6=Sat
  active: boolean;
  createdBy: string;
  createdAt: number;
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const REMINDER_SUGGESTIONS = [
  "Send a flirty text 💬",
  "Tell them one thing you love about them ❤️",
  "Surprise them with a small gesture 🎁",
  "Give a long hug when you see them 🤗",
  "Send a photo that made you think of them 📸",
  "Plan something fun for the weekend 🎉",
  "Leave a sticky note somewhere they'll find it 📝",
  "Tell them they look amazing today 😍",
  "Make their favorite drink or snack ☕",
  "Ask about their day and really listen 👂",
];

export function subscribeReminders(coupleId: string, onChange: (reminders: FlirtReminder[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'couples', coupleId, 'reminders'), (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FlirtReminder)));
  });
}

export async function addReminder(
  coupleId: string,
  reminder: Omit<FlirtReminder, 'id' | 'createdAt'>
): Promise<FlirtReminder> {
  const createdAt = Date.now();
  const ref = await addDoc(collection(db, 'couples', coupleId, 'reminders'), { ...reminder, createdAt });
  return { ...reminder, id: ref.id, createdAt };
}

export async function toggleReminder(coupleId: string, id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'reminders', id), { active });
}

export async function deleteReminder(coupleId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'reminders', id));
}

// ─── Local notification scheduling ───────────────────────────────────────────

function notifIdForDay(reminderId: string, day: number): string {
  return `reminder-${reminderId}-day${day}`;
}

export async function scheduleReminderNotifications(reminder: FlirtReminder): Promise<void> {
  if (Platform.OS === 'web') return;
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
  for (let day = 0; day < 7; day++) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notifIdForDay(reminderId, day));
    } catch { /* already cancelled */ }
  }
}
