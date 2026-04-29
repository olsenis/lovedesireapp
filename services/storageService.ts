import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadProfilePhoto(uid: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `users/${uid}/profile.jpg`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

export async function uploadMemoryPhoto(coupleId: string, uid: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const filename = `${Date.now()}_${uid}.jpg`;
  const storageRef = ref(storage, `couples/${coupleId}/memories/${filename}`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}
