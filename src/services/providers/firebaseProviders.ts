import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where,
} from '@react-native-firebase/firestore';
import { ProviderService, Provider } from './types';
import { LIMITS } from '../../constants/limits';

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

class FirebaseProviderService implements ProviderService {
  private db = getFirestore();
  private collectionName = 'providers';

  async findProviders(
    category: string,
    lat: number,
    lng: number,
    radiusKm: number = LIMITS.SEARCH_RADIUS_KM
  ): Promise<Provider[]> {
    const q = query(
      collection(this.db, this.collectionName),
      where('categories', 'array-contains', category),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q).catch(() => null);
    if (!snapshot) return [];
    const providers: Provider[] = [];

    snapshot.docs.forEach((d) => {
      const data = d.data();
      const distance = calculateDistance(lat, lng, data.location.lat, data.location.lng);

      if (distance <= radiusKm) {
        providers.push({
          id: d.id,
          name: data.name,
          phone: data.phone,
          categories: data.categories,
          location: data.location,
          radiusKm: data.radiusKm,
          rating: data.rating,
          isActive: data.isActive,
        });
      }
    });

    return providers
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);
  }

  async getProvider(providerId: string): Promise<Provider | null> {
    const docRef = doc(this.db, this.collectionName, providerId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists) return null;
    const data = snapshot.data()!;
    return { id: snapshot.id, ...data } as Provider;
  }

  async addProvider(provider: Omit<Provider, 'id'>): Promise<Provider> {
    const docRef = doc(collection(this.db, this.collectionName));
    await setDoc(docRef, provider);
    return { id: docRef.id, ...provider };
  }
}

export const providerService: ProviderService = new FirebaseProviderService();
