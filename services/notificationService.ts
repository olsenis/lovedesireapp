import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Couple } from './coupleService';
import { UserProfile } from './authService';

async function getPartnerToken(coupleId: string, myUid: string): Promise<string | null> {
  const coupleSnap = await getDoc(doc(db, 'couples', coupleId));
  if (!coupleSnap.exists()) return null;
  const couple = coupleSnap.data() as Couple;
  const partnerId = couple.partner1Uid === myUid ? couple.partner2Uid : couple.partner1Uid;
  if (!partnerId) return null;
  const partnerSnap = await getDoc(doc(db, 'users', partnerId));
  if (!partnerSnap.exists()) return null;
  return (partnerSnap.data() as UserProfile).pushToken ?? null;
}

export async function notifyPartner(
  coupleId: string,
  myUid: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const token = await getPartnerToken(coupleId, myUid);
    if (!token) return; // partner hasn't enabled notifications
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default' }),
    });
  } catch {
    // Notification failure should never break the main action
  }
}
