import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadProfilePhoto(uid: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `users/${uid}/profile.jpg`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

// uploadMemoryPhoto removed — old Memories feature replaced by Moments.
// Old Firebase Storage path couples/{coupleId}/memories/* still exists for historical "On this day".

export async function uploadTruthDareAudio(coupleId: string, uid: string, round: number, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `couples/${coupleId}/truthDare/${round}_${uid}.m4a`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

export async function uploadMomentPhoto(coupleId: string, uid: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const date = new Date().toISOString().slice(0, 10);
  const storageRef = ref(storage, `couples/${coupleId}/moments/${date}_${uid}.jpg`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

export async function uploadFlashMedia(
  coupleId: string,
  uid: string,
  uri: string,
  type: 'photo' | 'video' | 'voice'
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = type === 'video' ? 'mp4' : type === 'voice' ? 'm4a' : 'jpg';
  const filename = `${Date.now()}_${uid}.${ext}`;
  const storageRef = ref(storage, `couples/${coupleId}/flashes/${filename}`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}
