import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase Web app config — from Firebase Console → Project Settings → Web app.
// These are PUBLIC keys (safe to commit) — security comes from Firestore rules,
// not key secrecy. Hardcoded because Expo's static export doesn't reliably
// inject process.env vars into the web bundle.
const firebaseConfig = {
  apiKey: 'AIzaSyCsLNONMFW3_SOe0BX_HmtRvN39gAV2QME',
  authDomain: 'fixly-c4040.firebaseapp.com',
  projectId: 'fixly-c4040',
  storageBucket: 'fixly-c4040.firebasestorage.app',
  messagingSenderId: '111396659473',
  appId: '1:111396659473:web:234e43d0c03e33cc4aecb0',
  measurementId: 'G-EW19Q0174P',
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;

try {
  firebaseApp =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  firebaseDb = getFirestore(firebaseApp);
  // Auth requires a valid API key — defer if missing (e.g. during SSR)
  if (firebaseConfig.apiKey) {
    firebaseAuth = getAuth(firebaseApp);
  }
} catch (e) {
  // During SSR / static export, Firebase may fail to initialize.
  // The client bundle will re-initialize at runtime.
  console.warn('[firebaseWeb] init error (expected during SSR):', e);
}

export { firebaseApp, firebaseAuth, firebaseDb };
