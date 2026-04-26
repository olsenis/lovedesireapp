import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAXervwr8BoK-5tB0EN0bUWoduLz3x0iw4",
  authDomain: "lovedesireapp-8c7f2.firebaseapp.com",
  projectId: "lovedesireapp-8c7f2",
  storageBucket: "lovedesireapp-8c7f2.firebasestorage.app",
  messagingSenderId: "450675936461",
  appId: "1:450675936461:web:c1a150b2eb14ad99e56d84",
};

// Prevent re-initializing on hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
