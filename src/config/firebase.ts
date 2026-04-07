import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

export const db = getFirestore();
export const auth = getAuth();
