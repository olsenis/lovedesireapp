// "A little something for {partner}" (Sep 19 2026): the optional last step of
// the Sunday Check-in. It replaced "Call it" (hidden predictions about the
// partner, graded by the partner), which read as a hidden wish list and made
// the partner mark their own misses.
//
// The rule this file exists to keep: ONLY WHAT WAS DONE IS EVER SHOWN.
//   - A plan is about the writer's own behaviour, never the partner's.
//   - It lives in users/{uid}/private/sundayPlans (self-only by the existing
//     private/{doc} rule). It must never be written under couples/…, because
//     a Sunday entry becomes readable by the partner once both finish.
//   - At a later check-in the writer ticks what happened; the ticked items go
//     to their Sunday entry as `doneForPartner` (submitDoneForPartner in
//     stateUnionService). An unticked plan is resolved silently. No counts,
//     no "x of y", no mention of what did not happen, anywhere.
import { Platform } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Notifications } from './notificationsGuard';
import { trackEvent } from './statsService';
import { getPreviousWeekId } from './stateUnionService';
import { LoveLanguage } from '../constants/content';
import { LOVE_LANGUAGE_ACTIONS, GENERIC_SMALL_THINGS } from '../constants/loveLanguageActions';
import { APP_NAME } from '../constants/app';

export const MAX_PLANS = 3;
export const PLAN_LOOKBACK_WEEKS = 3;
export const PLAN_MAX_LENGTH = 100;
const KEEP_WEEKS = 8;
const REMINDER_ID = 'sunday-plan-reminder';
const REMINDER_AFTER_DAYS = 3;
const REMINDER_HOUR = 17;

export interface SundayPlan {
  weekId: string;
  coupleId: string;
  items: string[];
  createdAt: number;
  resolvedAt?: number;
}

interface SundayPlansDoc {
  plans?: Record<string, Omit<SundayPlan, 'weekId'>>;
}

const ref = (uid: string) => doc(db, 'users', uid, 'private', 'sundayPlans');

async function readPlans(uid: string): Promise<Record<string, Omit<SundayPlan, 'weekId'>>> {
  const snap = await getDoc(ref(uid));
  return ((snap.data() as SundayPlansDoc | undefined)?.plans) ?? {};
}

export async function savePlan(
  uid: string,
  coupleId: string,
  weekId: string,
  items: string[],
  partnerName: string,
): Promise<void> {
  const clean = items.map((t) => t.trim().slice(0, PLAN_MAX_LENGTH)).filter(Boolean).slice(0, MAX_PLANS);
  if (clean.length === 0) return;
  const plans = await readPlans(uid);
  plans[weekId] = { coupleId, items: clean, createdAt: Date.now() };
  // Week ids are zero-padded YYYY-WW, so a string sort is chronological.
  const keep = Object.keys(plans).sort().slice(-KEEP_WEEKS);
  const pruned: SundayPlansDoc['plans'] = {};
  for (const k of keep) pruned[k] = plans[k];
  await setDoc(ref(uid), { plans: pruned });
  trackEvent('sunday_plan_added');
  scheduleReminder(partnerName).catch(() => {});
}

// The newest unresolved plan made for THIS couple in one of the last
// PLAN_LOOKBACK_WEEKS weeks before `currentWeekId`. A plan made for a former
// partner is never offered (coupleId differs after a new pairing).
export async function getOpenPlan(uid: string, coupleId: string): Promise<SundayPlan | null> {
  const plans = await readPlans(uid);
  for (let back = 1; back <= PLAN_LOOKBACK_WEEKS; back++) {
    const w = getPreviousWeekId(new Date(), back);
    const p = plans[w];
    if (p && !p.resolvedAt && p.coupleId === coupleId && p.items?.length) return { weekId: w, ...p };
  }
  return null;
}

// This week's own plan, for the Monday love-language screen ("You already
// planned…"), so Sunday and Monday do not hand out the same errand twice.
export async function getRecentPlan(uid: string, coupleId: string): Promise<SundayPlan | null> {
  const plans = await readPlans(uid);
  const newest = Object.keys(plans).sort().reverse()
    .find((w) => !plans[w].resolvedAt && plans[w].coupleId === coupleId && plans[w].items?.length);
  return newest ? { weekId: newest, ...plans[newest] } : null;
}

export async function resolvePlan(uid: string, weekId: string, doneCount: number): Promise<void> {
  const plans = await readPlans(uid);
  if (!plans[weekId]) return;
  plans[weekId] = { ...plans[weekId], resolvedAt: Date.now() };
  await setDoc(ref(uid), { plans });
  if (doneCount > 0) trackEvent('sunday_plan_done');
  cancelReminder().catch(() => {});
}

// "Need an idea?": walks the partner's love-language pool, or a small
// generic list when the partner has not taken the quiz. `n` is how many
// times the button was tapped, so every tap shows the next one.
export function ideaFor(language: LoveLanguage | undefined, n: number): string {
  const pool = (language && LOVE_LANGUAGE_ACTIONS[language]?.length) ? LOVE_LANGUAGE_ACTIONS[language] : GENERIC_SMALL_THINGS;
  return pool[((n % pool.length) + pool.length) % pool.length];
}

// One local notification on this phone only. The body never carries the plan.
async function scheduleReminder(partnerName: string): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
    const when = new Date();
    when.setDate(when.getDate() + REMINDER_AFTER_DAYS);
    when.setHours(REMINDER_HOUR, 0, 0, 0);
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: APP_NAME,
        body: `You planned a little something for ${partnerName} this week.`,
        sound: false,
        data: { route: '/love-language-nudge' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch {
    // Notifications unavailable or not permitted: the plan still works.
  }
}

async function cancelReminder(): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  try { await Notifications.cancelScheduledNotificationAsync(REMINDER_ID); } catch { /* nothing scheduled */ }
}
