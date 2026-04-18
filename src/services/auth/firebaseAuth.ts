import {
  getAuth,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  deleteUser as firebaseDeleteUser,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from '@react-native-firebase/auth';
import { AuthService, PhoneSignInResult, AuthUser } from './types';

class FirebaseAuthService implements AuthService {
  private auth = getAuth();
  private confirmationResult: any = null;

  async signInWithPhone(phoneNumber: string): Promise<PhoneSignInResult> {
    this.confirmationResult = await signInWithPhoneNumber(this.auth, phoneNumber);
    return { verificationId: this.confirmationResult.verificationId };
  }

  async confirmOtp(verificationId: string, code: string): Promise<void> {
    if (!this.confirmationResult) {
      throw new Error('No pending confirmation. Call signInWithPhone first.');
    }
    await this.confirmationResult.confirm(code);
    this.confirmationResult = null;
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }

  async deleteAccount(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not signed in');
    await firebaseDeleteUser(user);
  }

  getCurrentUser(): AuthUser | null {
    const user = this.auth.currentUser;
    if (!user) return null;
    return { uid: user.uid, phoneNumber: user.phoneNumber };
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return firebaseOnAuthStateChanged(this.auth, (firebaseUser) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }
      callback({ uid: firebaseUser.uid, phoneNumber: firebaseUser.phoneNumber });
    });
  }
}

export const authService: AuthService = new FirebaseAuthService();
