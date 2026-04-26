import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  uid: string;
  name: string;
  photoURL?: string;
  coupleId?: string;
  inviteCode?: string;
  createdAt: number;
}

export async function register(email: string, password: string): Promise<User> {
  // TODO: implement registration + create user doc in Firestore
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function login(email: string, password: string): Promise<User> {
  // TODO: implement login
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout(): Promise<void> {
  // TODO: implement logout + clear secure store
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  // TODO: fetch user profile from Firestore
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function createUserProfile(
  uid: string,
  profile: Omit<UserProfile, 'uid' | 'createdAt'>
): Promise<void> {
  // TODO: create/update user profile in Firestore
  await setDoc(doc(db, 'users', uid), {
    ...profile,
    uid,
    createdAt: Date.now(),
  });
}
