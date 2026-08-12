import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { storage } from './firebase';

// Hard upload ceilings enforced AFTER compression / on raw blob. These are
// safety nets — compressImage() usually keeps photos under 2MB, but if
// manipulation fails on an unsupported format we fall back to the original
// URI, and a modern phone photo can be 15-30MB. Without a ceiling here, a
// paying user could DOS the couple's Storage bucket with a single tap.
const MAX_PHOTO_BYTES  =  5 * 1024 * 1024;  //   5 MB
const MAX_VIDEO_BYTES  = 60 * 1024 * 1024;  //  60 MB (~30s 1080p)
const MAX_AUDIO_BYTES  = 10 * 1024 * 1024;  //  10 MB (~10 min m4a)

export class UploadTooLargeError extends Error {
  constructor(public actualBytes: number, public maxBytes: number, public kind: string) {
    super(`${kind} is ${Math.round(actualBytes / 1024 / 1024)} MB, max ${Math.round(maxBytes / 1024 / 1024)} MB`);
    this.name = 'UploadTooLargeError';
  }
}

function assertUnderLimit(blob: Blob, kind: 'photo' | 'video' | 'audio'): void {
  const limit = kind === 'photo' ? MAX_PHOTO_BYTES : kind === 'video' ? MAX_VIDEO_BYTES : MAX_AUDIO_BYTES;
  if (blob.size > limit) throw new UploadTooLargeError(blob.size, limit, kind);
}

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
  assertUnderLimit(blob, 'photo');
  const storageRef = ref(storage, `users/${uid}/profile.jpg`);
  // Explicit contentType — in React Native, fetch(file://).blob() often
  // returns a Blob without .type set, which Firebase then uploads as
  // application/octet-stream. That would fail the storage.rules
  // contentType.matches('image/.*|video/.*|audio/.*') guard added in
  // security review v2 NV4. compressImage always outputs JPEG.
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return await getDownloadURL(storageRef);
}

// uploadMemoryPhoto removed — old Memories feature replaced by Moments.
// Old Firebase Storage path couples/{coupleId}/memories/* still exists for historical "On this day".

export async function uploadTruthDareAudio(coupleId: string, uid: string, round: number, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  assertUnderLimit(blob, 'audio');
  const storageRef = ref(storage, `couples/${coupleId}/truthDare/${round}_${uid}.m4a`);
  // audio/mp4 is the MIME for .m4a container. Explicit for the NV4 rule
  // (see uploadProfilePhoto for full rationale).
  await uploadBytes(storageRef, blob, { contentType: 'audio/mp4' });
  return await getDownloadURL(storageRef);
}

export async function uploadMomentPhoto(coupleId: string, uid: string, uri: string): Promise<string> {
  const compressed = await compressImage(uri);
  const response = await fetch(compressed);
  const blob = await response.blob();
  assertUnderLimit(blob, 'photo');
  const date = new Date().toISOString().slice(0, 10);
  const storageRef = ref(storage, `couples/${coupleId}/moments/${date}_${uid}.jpg`);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
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
  assertUnderLimit(blob, type === 'photo' ? 'photo' : type === 'video' ? 'video' : 'audio');
  const ext = type === 'video' ? 'mp4' : type === 'voice' ? 'm4a' : 'jpg';
  const filename = `${Date.now()}_${uid}.${ext}`;
  const storageRef = ref(storage, `couples/${coupleId}/flashes/${filename}`);
  // Map type → MIME so the storage.rules contentType guard passes.
  // photo=image/jpeg (compressImage output), video=video/mp4, voice=audio/mp4.
  const contentType = type === 'photo' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'audio/mp4';
  await uploadBytes(storageRef, blob, { contentType });
  return await getDownloadURL(storageRef);
}
