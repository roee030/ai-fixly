import { SERVICE_ZONE } from '../constants/serviceZone';

/**
 * Check if a coordinate is within the service zone.
 * Uses the Haversine formula for great-circle distance.
 */
export function isInServiceZone(lat: number, lng: number): boolean {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat - SERVICE_ZONE.center.lat);
  const dLng = toRad(lng - SERVICE_ZONE.center.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(SERVICE_ZONE.center.lat)) *
      Math.cos(toRad(lat)) *
      Math.sin(dLng / 2) ** 2;

  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distance <= SERVICE_ZONE.radiusKm;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
