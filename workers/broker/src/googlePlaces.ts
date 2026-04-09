/**
 * Google Places (New) API integration.
 *
 * We use the "Nearby Search (New)" endpoint which returns businesses matching
 * an `includedType` near a location. Docs:
 *   https://developers.google.com/maps/documentation/places/web-service/nearby-search
 *
 * The profession strings we pass in are Google Places business types (e.g.
 * "plumber", "electrician"). The AI returns these directly so we don't need a
 * translation layer.
 */

export interface PlacesProvider {
  placeId: string;
  name: string;
  phone: string | null;
  rating: number | null;
  address: string;
  location: { lat: number; lng: number };
}

interface NearbySearchResult {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    rating?: number;
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
  }>;
}

export async function findNearbyProviders(params: {
  apiKey: string;
  profession: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  maxResults: number;
}): Promise<PlacesProvider[]> {
  const { apiKey, profession, lat, lng, radiusMeters, maxResults } = params;

  const url = 'https://places.googleapis.com/v1/places:searchNearby';

  const body = {
    includedTypes: [profession],
    maxResultCount: Math.min(maxResults, 20),
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      // We only need these fields — keeps cost down
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.formattedAddress,places.location',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Places error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as NearbySearchResult;

  if (!data.places) {
    return [];
  }

  return data.places
    .map<PlacesProvider | null>((p) => {
      const phone = p.internationalPhoneNumber || p.nationalPhoneNumber || null;
      if (!phone) return null; // Can't WhatsApp without phone
      return {
        placeId: p.id,
        name: p.displayName?.text || 'ללא שם',
        phone: normalizePhoneToE164(phone),
        rating: p.rating ?? null,
        address: p.formattedAddress || '',
        location: {
          lat: p.location?.latitude ?? lat,
          lng: p.location?.longitude ?? lng,
        },
      };
    })
    .filter((p): p is PlacesProvider => p !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

/**
 * Normalize a phone number string to E.164 format (e.g. +972501234567).
 * Google Places returns numbers in various formats depending on locale.
 */
function normalizePhoneToE164(phone: string): string {
  if (!phone) return phone;
  // Remove everything except digits and leading +
  const hasPlus = phone.trim().startsWith('+');
  const digits = phone.replace(/[^\d]/g, '');
  return hasPlus ? `+${digits}` : `+${digits}`;
}
