import { CITY_BOXES, UNKNOWN_CITY } from '../constants/cities';
import type { LocationSummary } from '../types';

/**
 * Map lat/lng to the first matching metro bounding box. Returns
 * { city: 'unknown', region: 'unknown' } when no box contains the point.
 *
 * Cheap, zero-API-call alternative to reverse-geocoding. Good enough for
 * admin filtering. Revisit when the metro list outgrows the boxes.
 */
export function resolveCity(lat: number, lng: number): LocationSummary {
  for (const box of CITY_BOXES) {
    if (lat >= box.minLat && lat <= box.maxLat
        && lng >= box.minLng && lng <= box.maxLng) {
      return { city: box.city, region: box.region };
    }
  }
  return UNKNOWN_CITY;
}
