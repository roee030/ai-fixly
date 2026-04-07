export interface AuthService {
  signInWithPhone(phoneNumber: string): Promise<PhoneSignInResult>;
  confirmOtp(verificationId: string, code: string): Promise<void>;
  signOut(): Promise<void>;
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
