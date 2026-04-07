export interface Provider {
  id: string;
  phone: string;
  displayName: string;
  businessName: string;
  categories: string[];
  location: {
    lat: number;
    lng: number;
  };
  radiusKm: number;
  rating: number;
  isAvailable: boolean;
}
