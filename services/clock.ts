// A time of day as THIS phone shows it: "18:00" or "6:00 PM", the phone's own
// 12 / 24-hour setting decides (Sep 24 2026). Until then every clock in the
// app was forced to en-GB 24-hour, which reads wrong to a US user, and the
// Android time picker was forced to a 24-hour dial. Notifications are booked
// by hour and minute and never depended on this.
// Throws on an invalid timeZone, on purpose: the LDR clock on Home catches
// that and shows no clock, which beats showing the wrong one.
export function formatClock(d: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', ...(timeZone ? { timeZone } : {}) }).format(d);
}

// "HH:mm" (how Reminders stores a time) shown the same way.
export function formatClockHHmm(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return formatClock(d);
}
