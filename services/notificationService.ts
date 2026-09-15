import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Couple } from './coupleService';
import { UserProfile } from './authService';

async function getPartnerToken(coupleId: string, myUid: string): Promise<{ token: string; partnerUid: string; discreet: boolean } | null> {
  const coupleSnap = await getDoc(doc(db, 'couples', coupleId));
  if (!coupleSnap.exists()) return null;
  const couple = coupleSnap.data() as Couple;
  const partnerId = couple.partner1Uid === myUid ? couple.partner2Uid : couple.partner1Uid;
  if (!partnerId) return null;
  const partnerSnap = await getDoc(doc(db, 'users', partnerId));
  if (!partnerSnap.exists()) return null;
  const profile = partnerSnap.data() as UserProfile;
  // Respect partner's in-app toggle. notificationsEnabled === false means they
  // explicitly turned them off in Profile, even if the token still exists.
  if (profile.notificationsEnabled === false) return null;
  const token = profile.pushToken;
  if (!token) return null;
  // Discreet lock-screen wording is the RECIPIENT's choice; absent means on.
  return { token, partnerUid: partnerId, discreet: profile.discreetNotifications !== false };
}

// Per-partner-per-title cooldown so a user rapidly flipping cards / accepting
// prompts / hitting Send doesn't spam the partner with 4-5 pushes per second.
// Key is `${partnerUid}:${title}`; last send timestamp in ms. Client-side only —
// a full solution would rate-limit server-side, but this catches the 90% case.
const COOLDOWN_MS = 10_000;
const lastSent = new Map<string, number>();

// Discreet notifications (Sep 2026, USER_VOICE A4). A call site whose full
// text carries words that do not belong on a lock screen at work (Tonight,
// Fantasy Wishes, Intimacy Log, mood labels, card text, Tease captions,
// love-tap messages, list suggestions) passes a `discreet` variant: the
// app and a name, never the words. The recipient's profile decides
// (`discreetNotifications`, default on); the ten neutral pushes pass no
// variant and are unchanged. Cooldown is keyed on the full title so both
// variants share it.
export async function notifyPartner(
  coupleId: string,
  myUid: string,
  title: string,
  body: string,
  discreet?: { title: string; body: string },
): Promise<void> {
  try {
    const result = await getPartnerToken(coupleId, myUid);
    if (!result) return; // partner hasn't enabled notifications
    const key = `${result.partnerUid}:${title}`;
    const last = lastSent.get(key) ?? 0;
    const now = Date.now();
    if (now - last < COOLDOWN_MS) return; // silently swallow, don't spam
    lastSent.set(key, now);
    const sent = discreet && result.discreet ? discreet : { title, body };
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: result.token, title: sent.title, body: sent.body, sound: 'default' }),
    });
  } catch {
    // Notification failure should never break the main action
  }
}
