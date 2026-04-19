import { getAuth } from '@react-native-firebase/auth';
import { logger } from '../logger';

const BROKER_URL = process.env.EXPO_PUBLIC_BROKER_URL || '';

/**
 * Toggle the current user's vacation mode. Hits a broker endpoint rather
 * than writing Firestore directly so the security rules can stay tight
 * (only the broker — using the Admin SDK — is allowed to mutate
 * `users.{uid}.providerProfile`).
 *
 * Throws on non-2xx so the caller can roll back its optimistic UI.
 */
export async function setVacationMode(value: boolean): Promise<void> {
  if (!BROKER_URL) {
    throw new Error('broker_url_missing');
  }
  const user = getAuth().currentUser;
  if (!user) {
    throw new Error('not_authenticated');
  }
  const idToken = await user.getIdToken();

  const res = await fetch(`${BROKER_URL}/provider/vacation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ isOnVacation: value }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.warn('[providerVacation] failed', {
      status: String(res.status),
      body: text.slice(0, 200),
    });
    throw new Error(`vacation_update_failed_${res.status}`);
  }
}
