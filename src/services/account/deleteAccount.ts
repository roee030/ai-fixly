import { authService } from '../auth';
import { getFirestore, doc, updateDoc } from '../firestore/imports';
import { resetSubmissions } from '../rateLimit/requestRateLimit';
import { logger } from '../logger';

/**
 * Orchestrates the three-step account-deletion chain required by Apple and
 * Google for app-store publication:
 *
 *   1. Soft-delete the user's Firestore profile doc (strip PII, mark
 *      `deleted: true` + `deletedAt`). Full delete is intentionally
 *      avoided: providers who already did work for this user keep their
 *      bid records, chats stay attached to the (anonymised) uid, and
 *      nothing in the historical ledger breaks.
 *
 *   2. Delete the Firebase Auth account. This fails with
 *      `auth/requires-recent-login` if the user hasn't verified their
 *      phone in a while — callers surface that to the user and force a
 *      re-OTP flow, then retry.
 *
 *   3. Clear local caches that key off uid (rate-limit timestamps) so a
 *      new user signing in on this device starts clean.
 *
 * Step 2 implicitly triggers Firebase's auth-state change listener, which
 * the app's AuthGate interprets as "not signed in" and reroutes to phone.
 */
export async function deleteAccountCompletely(): Promise<void> {
  const user = authService.getCurrentUser();
  if (!user) {
    logger.warn('[delete-account] called with no signed-in user');
    return;
  }
  const uid = user.uid;

  try {
    const db = getFirestore();
    await updateDoc(doc(db, 'users', uid), {
      deleted: true,
      deletedAt: new Date(),
      // PII wipe — everything that could identify the user.
      displayName: 'משתמש מחוק',
      phoneNumber: null,
      address: null,
      location: null,
      fcmToken: null,
      fcmTokenWeb: null,
    });
  } catch (err) {
    // Don't block account deletion on a failed PII wipe — the Auth delete
    // below is the real goal. We log and continue.
    logger.error('[delete-account] PII wipe failed', err as Error);
  }

  // Step 2 throws `auth/requires-recent-login` if Firebase wants a fresh
  // sign-in. Bubble up so the caller can route to re-verification.
  await authService.deleteAccount();

  // Step 3 — local cleanup.
  try {
    await resetSubmissions();
  } catch {
    // non-blocking
  }
}
