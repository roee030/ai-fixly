export interface Provider {
  id: string;
  name: string;
  phone: string;
  categories: string[];
  location: {
    lat: number;
    lng: number;
  };
  radiusKm: number;
  rating: number;
  isActive: boolean;
}

export interface ProviderService {
  findProviders(category: string, lat: number, lng: number, radiusKm?: number): Promise<Provider[]>;
  getProvider(providerId: string): Promise<Provider | null>;
  addProvider(provider: Omit<Provider, 'id'>): Promise<Provider>;
}
