import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

// Same Firebase project (lovedesireapp-8c7f2) as the mobile app.
// Config values are publicly discoverable in every deployed web bundle by
// design — Firebase security lives in Firestore rules + assertAdmin in
// Cloud Functions, not in hiding this config.
const firebaseConfig = {
  apiKey: 'AIzaSyAXervwr8BoK-5tB0EN0bUWoduLz3x0iw4',
  authDomain: 'lovedesireapp-8c7f2.firebaseapp.com',
  projectId: 'lovedesireapp-8c7f2',
  storageBucket: 'lovedesireapp-8c7f2.firebasestorage.app',
  messagingSenderId: '450675936461',
  appId: '1:450675936461:web:c1a150b2eb14ad99e56d84',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const functions = getFunctions(app);
