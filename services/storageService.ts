import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { storage } from './firebase';

// Compress an image at the URI to max 1920px wide + JPEG quality 0.7.
// At scale this cuts photo bandwidth ~5-10× vs raw camera output (10MB → 1-2MB).
// Returns a new URI pointing to the compressed file in the OS temp dir.
async function compressImage(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    // If manipulation fails (e.g. unsupported format on web), fall back to the original
    return uri;
  }
}

export async function uploadProfilePhoto(uid: string, uri: string): Promise<string> {
  const compressed = await compressImage(uri);
  const response = await fetch(compressed);
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
  const compressed = await compressImage(uri);
  const response = await fetch(compressed);
  const blob = await response.blob();
  const date = new Date().toISOString().slice(0, 10);
  const storageRef = ref(storage, `couples/${coupleId}/moments/${date}_${uid}.jpg`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

export async function uploadCapsulePhoto(coupleId: string, uid: string, uri: string): Promise<string> {
  const compressed = await compressImage(uri);
  const response = await fetch(compressed);
  const blob = await response.blob();
  const storageRef = ref(storage, `couples/${coupleId}/timeCapsules/${Date.now()}_${uid}.jpg`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

export async function uploadFlashMedia(
  coupleId: string,
  uid: string,
  uri: string,
  type: 'photo' | 'video' | 'voice'
): Promise<string> {
  // Only compress photos — video and voice need their original encoding
  const sourceUri = type === 'photo' ? await compressImage(uri) : uri;
  const response = await fetch(sourceUri);
  const blob = await response.blob();
  const ext = type === 'video' ? 'mp4' : type === 'voice' ? 'm4a' : 'jpg';
  const filename = `${Date.now()}_${uid}.${ext}`;
  const storageRef = ref(storage, `couples/${coupleId}/flashes/${filename}`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}
