import {
  getAuth,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  deleteUser as firebaseDeleteUser,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  RecaptchaVerifier,
  type ConfirmationResult,
  type Auth,
} from 'firebase/auth';
import { firebaseApp } from '../../config/firebaseWeb';
import { AuthService, PhoneSignInResult, AuthUser } from './types';

/**
 * Lazily get the Auth instance. During SSR the API key may be empty,
 * so we defer initialization until the first real call.
 */
let _auth: Auth | null = null;
function getAuthInstance(): Auth {
  if (!_auth) {
    if (!firebaseApp) throw new Error('Firebase not initialized');
    _auth = getAuth(firebaseApp);
  }
  return _auth;
}

class FirebaseAuthWebService implements AuthService {
  private confirmationResult: ConfirmationResult | null = null;

  async signInWithPhone(phoneNumber: string): Promise<PhoneSignInResult> {
    const auth = getAuthInstance();
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      container.style.display = 'none';
      document.body.appendChild(container);
    }

    const verifier = new RecaptchaVerifier(auth, container, {
      size: 'invisible',
    });
    this.confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      verifier
    );
    return { verificationId: 'web-verification' };
  }

  async confirmOtp(_verificationId: string, code: string): Promise<void> {
    if (!this.confirmationResult) {
      throw new Error('No pending confirmation. Call signInWithPhone first.');
    }
    await this.confirmationResult.confirm(code);
    this.confirmationResult = null;
  }

  async signOut(): Promise<void> {
    const auth = getAuthInstance();
    await firebaseSignOut(auth);
  }

  async deleteAccount(): Promise<void> {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user) throw new Error('Not signed in');
    await firebaseDeleteUser(user);
  }

  getCurrentUser(): AuthUser | null {
    try {
      const auth = getAuthInstance();
      const user = auth.currentUser;
      if (!user) return null;
      return { uid: user.uid, phoneNumber: user.phoneNumber };
    } catch {
      return null;
    }
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    try {
      const auth = getAuthInstance();
      return firebaseOnAuthStateChanged(auth, (firebaseUser) => {
        if (!firebaseUser) {
          callback(null);
          return;
        }
        callback({
          uid: firebaseUser.uid,
          phoneNumber: firebaseUser.phoneNumber,
        });
      });
    } catch {
      // During SSR, auth is not available. Return a no-op unsubscribe.
      callback(null);
      return () => {};
    }
  }
}

export const authService: AuthService = new FirebaseAuthWebService();
