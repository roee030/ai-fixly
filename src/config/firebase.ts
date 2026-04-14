import { getFirestore } from '../services/firestore/imports';
import { getAuth } from '@react-native-firebase/auth';

export const db = getFirestore();
export const auth = getAuth();
