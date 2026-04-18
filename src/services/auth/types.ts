export interface AuthService {
  signInWithPhone(phoneNumber: string): Promise<PhoneSignInResult>;
  confirmOtp(verificationId: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  /**
   * Permanently delete the signed-in user's Firebase Auth account.
   * Soft-delete of Firestore PII is the caller's responsibility —
   * separated so the deletion chain can log analytics before the Auth
   * account disappears.
   *
   * May throw `auth/requires-recent-login` — caller should then force a
   * re-verification and try again.
   */
  deleteAccount(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
}

export interface PhoneSignInResult {
  verificationId: string;
}

export interface AuthUser {
  uid: string;
  phoneNumber: string | null;
}
