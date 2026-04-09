/**
 * KV-backed cache for Google Places results.
 *
 * Cost optimization: Google Places "Nearby Search (New)" costs ~$32 per 1000
 * requests. Caching dramatically reduces cost for popular areas.
 *
 * Strategy:
 * - Round lat/lng to 2 decimal places (~1.1km precision). Users within the
 *   same ~1km² grid cell share cached results for the same profession.
 * - Cache for 24 hours by default. Providers don't change that often.
 * - Cache miss → call Google Places, store result, return.
 */

import { findNearbyProviders, PlacesProvider } from './googlePlaces';

export interface CacheParams {
  kv: KVNamespace;
  apiKey: string;
  profession: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  maxResults: number;
  ttlSeconds: number;
}

export async function findNearbyProvidersCached(params: CacheParams): Promise<PlacesProvider[]> {
  const { kv, apiKey, profession, lat, lng, radiusMeters, maxResults, ttlSeconds } = params;

  const cacheKey = buildCacheKey(profession, lat, lng, radiusMeters);

  // Try cache first
  try {
    const cached = await kv.get(cacheKey, 'json');
    if (cached) {
      console.log(`[cache HIT] ${cacheKey}`);
      return cached as PlacesProvider[];
    }
  } catch (err) {
    // KV errors shouldn't break the flow
    console.warn('KV read failed:', err);
  }

  console.log(`[cache MISS] ${cacheKey}`);

  // Cache miss - call Google Places
  const providers = await findNearbyProviders({
    apiKey,
    profession,
    lat,
    lng,
    radiusMeters,
    maxResults,
  });

  // Store in cache (fire-and-forget, don't block response)
  if (providers.length > 0) {
    try {
      await kv.put(cacheKey, JSON.stringify(providers), {
        expirationTtl: ttlSeconds,
      });
    } catch (err) {
      console.warn('KV write failed:', err);
    }
  }

  return providers;
}

/**
 * Build a cache key that groups nearby requests together.
 * Rounding lat/lng to 2 decimal places = ~1.1km precision.
 */
function buildCacheKey(profession: string, lat: number, lng: number, radiusMeters: number): string {
  const latRounded = lat.toFixed(2);
  const lngRounded = lng.toFixed(2);
  return `places:${profession}:${latRounded}:${lngRounded}:r${radiusMeters}`;
}
