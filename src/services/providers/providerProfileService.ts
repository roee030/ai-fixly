import { getFirestore, doc, onSnapshot } from '../firestore/imports';
import type { ProviderProfile } from '../../types/providerProfile';

/**
 * Read + subscribe to a user's `providerProfile` sub-field. Returns null
 * when the user is a regular customer (no providerProfile set).
 *
 * We subscribe rather than fetch-once so the Dashboard reflects vacation
 * toggle changes the broker writes back, and so an owner adding a provider
 * via the CLI immediately surfaces in the user's app without a relaunch.
 */
export function subscribeToProviderProfile(
  uid: string,
  onChange: (profile: ProviderProfile | null) => void,
): () => void {
  const db = getFirestore();
  const ref = doc(db, 'users', uid);
  const unsubscribe = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists) return onChange(null);
      const data = snap.data() as any;
      const raw = data?.providerProfile;
      if (!raw || !raw.profession) return onChange(null);

      // Firestore Timestamp → JS Date for `approvedAt`.
      const approvedAt =
        raw.approvedAt && typeof raw.approvedAt.toDate === 'function'
          ? raw.approvedAt.toDate()
          : raw.approvedAt instanceof Date
            ? raw.approvedAt
            : new Date(0);

      onChange({
        profession: String(raw.profession),
        professionLabelHe: String(raw.professionLabelHe || raw.profession),
        phone: String(raw.phone || ''),
        location: {
          lat: Number(raw.location?.lat) || 0,
          lng: Number(raw.location?.lng) || 0,
        },
        serviceRadiusKm: Number(raw.serviceRadiusKm) || 20,
        isOnVacation: raw.isOnVacation === true,
        approvedAt,
      });
    },
    (err) => {
      // Silent on permission errors — most users aren't providers and
      // their security rules may forbid reading providerProfile fields
      // they don't have. Surface unexpected errors only.
      const code = (err as { code?: string })?.code;
      if (code !== 'permission-denied') {
        // eslint-disable-next-line no-console
        console.warn('[providerProfile] snapshot error:', err);
      }
      onChange(null);
    },
  );
  return unsubscribe;
}
