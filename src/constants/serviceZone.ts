/**
 * Defines the geographic area where ai-fixly is currently active.
 * Used by the geo-fence check in profile setup and by the worker
 * for search radius validation.
 *
 * Update these values when expanding to new regions. No code change
 * needed — just update center/radius/area names.
 */
export const SERVICE_ZONE = {
  center: { lat: 32.45, lng: 34.92 },
  radiusKm: 20,
  nameHe: 'חדרה, קיסריה, נתניה ועמק חפר',
  activeAreas: [
    'חדרה',
    'קיסריה',
    'אור עקיבא',
    'פרדס חנה-כרכור',
    'בנימינה',
    'נתניה',
    'עמק חפר',
  ],
} as const;
