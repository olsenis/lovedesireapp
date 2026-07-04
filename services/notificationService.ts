import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Couple } from './coupleService';
import { UserProfile } from './authService';

async function getPartnerToken(coupleId: string, myUid: string): Promise<{ token: string; partnerUid: string } | null> {
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
  return { token, partnerUid: partnerId };
}

// Per-partner-per-title cooldown so a user rapidly flipping cards / accepting
// prompts / hitting Send doesn't spam the partner with 4-5 pushes per second.
// Key is `${partnerUid}:${title}`; last send timestamp in ms. Client-side only —
// a full solution would rate-limit server-side, but this catches the 90% case.
const COOLDOWN_MS = 10_000;
const lastSent = new Map<string, number>();

export async function notifyPartner(
  coupleId: string,
  myUid: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const result = await getPartnerToken(coupleId, myUid);
    if (!result) return; // partner hasn't enabled notifications
    const key = `${result.partnerUid}:${title}`;
    const last = lastSent.get(key) ?? 0;
    const now = Date.now();
    if (now - last < COOLDOWN_MS) return; // silently swallow, don't spam
    lastSent.set(key, now);
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: result.token, title, body, sound: 'default' }),
    });
  } catch {
    // Notification failure should never break the main action
  }
}
