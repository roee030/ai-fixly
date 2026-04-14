/**
 * Google Places (New) API integration.
 *
 * Two endpoints are used:
 *   1. searchNearby — fast, precise category match. Only works for a limited
 *      set of Google-defined business types.
 *   2. searchText   — accepts any natural-language query (including Hebrew).
 *      Used as a fallback for professions that don't map to a Google type.
 *
 * After fetching, results are filtered to only keep providers whose phone
 * number is likely WhatsApp-capable (mobile, not landline). See phoneUtils.ts.
 *
 * Docs:
 *   https://developers.google.com/maps/documentation/places/web-service/nearby-search
 *   https://developers.google.com/maps/documentation/places/web-service/text-search
 *   https://developers.google.com/maps/documentation/places/web-service/place-types
 */

import { isLikelyWhatsAppCapable, normalizeIsraeliPhone } from './phoneUtils';
import { getGooglePlacesType, getHebrewSearchQuery } from './professionConfig';

export interface PlacesProvider {
  placeId: string;
  name: string;
  phone: string | null;
  rating: number | null;
  address: string;
  location: { lat: number; lng: number };
}

interface PlacesSearchResponse {
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

const FIELD_MASK =
  'places.id,places.displayName,places.nationalPhoneNumber,' +
  'places.internationalPhoneNumber,places.rating,places.formattedAddress,places.location';

export async function findNearbyProviders(params: {
  apiKey: string;
  profession: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  maxResults: number;
}): Promise<PlacesProvider[]> {
  const googleType = getGooglePlacesType(params.profession);

  // Prefer typed nearby search when we have a valid Google type
  if (googleType) {
    try {
      return await searchNearby({ ...params, googleType });
    } catch (err) {
      console.warn(
        `[places] searchNearby failed for ${params.profession} (${googleType}), falling back to text search:`,
        err
      );
    }
  }

  // Fall back to Hebrew text search
  const textQuery = getHebrewSearchQuery(params.profession);
  return await searchText({ ...params, textQuery });
}

async function searchNearby(params: {
  apiKey: string;
  googleType: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  maxResults: number;
}): Promise<PlacesProvider[]> {
  const url = 'https://places.googleapis.com/v1/places:searchNearby';
  const body = {
    includedTypes: [params.googleType],
    maxResultCount: Math.min(params.maxResults, 20),
    locationRestriction: {
      circle: {
        center: { latitude: params.lat, longitude: params.lng },
        radius: params.radiusMeters,
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': params.apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Places (nearby) error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as PlacesSearchResponse;
  return parseProviders(data, params.lat, params.lng);
}

async function searchText(params: {
  apiKey: string;
  textQuery: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  maxResults: number;
}): Promise<PlacesProvider[]> {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const body = {
    textQuery: params.textQuery,
    // Bias (not restrict) to the user's area. Text search can return providers
    // slightly outside the circle but still relevant.
    locationBias: {
      circle: {
        center: { latitude: params.lat, longitude: params.lng },
        radius: params.radiusMeters,
      },
    },
    pageSize: Math.min(params.maxResults, 20),
    languageCode: 'he',
    regionCode: 'IL',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': params.apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Places (text) error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as PlacesSearchResponse;
  return parseProviders(data, params.lat, params.lng);
}

function parseProviders(
  data: PlacesSearchResponse,
  fallbackLat: number,
  fallbackLng: number
): PlacesProvider[] {
  if (!data.places) return [];

  let totalWithPhone = 0;
  let dropped = 0;

  const parsed = data.places
    .map<PlacesProvider | null>((p) => {
      const phone = p.internationalPhoneNumber || p.nationalPhoneNumber || null;
      if (!phone) return null; // Can't WhatsApp without a phone
      totalWithPhone++;

      const normalized = normalizeIsraeliPhone(phone);

      // WhatsApp-capability filter: skip landlines, service numbers, etc.
      // See phoneUtils.ts for the heuristic. This is the biggest win we can
      // get for reliability without paying for Twilio Lookup.
      if (!isLikelyWhatsAppCapable(normalized)) {
        dropped++;
        return null;
      }

      return {
        placeId: p.id,
        name: p.displayName?.text || 'ללא שם',
        phone: normalized,
        rating: p.rating ?? null,
        address: p.formattedAddress || '',
        location: {
          lat: p.location?.latitude ?? fallbackLat,
          lng: p.location?.longitude ?? fallbackLng,
        },
      };
    })
    .filter((p): p is PlacesProvider => p !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  if (dropped > 0) {
    console.log(
      `[places] filtered ${dropped}/${totalWithPhone} providers (non-mobile phones)`
    );
  }

  return parsed;
}

// Phone normalization is now delegated to normalizeIsraeliPhone in
// phoneUtils.ts, which handles both E.164 and local-format Israeli numbers.
