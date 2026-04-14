// Re-export everything from firebase/firestore for web platform.
// Override getFirestore to always return the pre-initialized instance
// so callers don't need to pass the app reference.
import { firebaseDb } from '../../config/firebaseWeb';
import {
  getFirestore as _getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

function getFirestore(): ReturnType<typeof _getFirestore> {
  if (firebaseDb) return firebaseDb;
  // Fallback: call the real getFirestore (works if initializeApp was called)
  return _getFirestore();
}

export {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
};
