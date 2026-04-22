import type { LocationSummary } from '../types';

export interface CityBox {
  city: string;
  region: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Rough bounding boxes for Israeli metros we target. Generous enough that
 * GPS drift + nearby suburbs land inside the right city; tight enough that
 * adjacent metros don't overlap meaningfully.
 *
 * Order matters: the first matching box wins. Keep denser/smaller metros
 * (e.g. Ramat Gan inside Greater TLV) above their larger neighbours.
 */
export const CITY_BOXES: CityBox[] = [
  // ── Sharon region ────────────────────────────────────────────────────────
  { city: 'hadera',       region: 'sharon',  minLat: 32.40, maxLat: 32.48, minLng: 34.88, maxLng: 34.96 },
  { city: 'netanya',      region: 'sharon',  minLat: 32.28, maxLat: 32.38, minLng: 34.83, maxLng: 34.90 },
  { city: 'kfar_saba',    region: 'sharon',  minLat: 32.16, maxLat: 32.22, minLng: 34.88, maxLng: 34.95 },
  { city: 'raanana',      region: 'sharon',  minLat: 32.17, maxLat: 32.20, minLng: 34.85, maxLng: 34.89 },
  { city: 'herzliya',     region: 'sharon',  minLat: 32.14, maxLat: 32.20, minLng: 34.78, maxLng: 34.85 },

  // ── Greater Tel Aviv (dense — specific metros before the wider TLV box) ──
  { city: 'ramat_gan',    region: 'center',  minLat: 32.05, maxLat: 32.10, minLng: 34.81, maxLng: 34.86 },
  { city: 'petah_tikva',  region: 'center',  minLat: 32.06, maxLat: 32.11, minLng: 34.85, maxLng: 34.92 },
  { city: 'bat_yam',      region: 'center',  minLat: 32.00, maxLat: 32.04, minLng: 34.73, maxLng: 34.77 },
  { city: 'rishon',       region: 'center',  minLat: 31.95, maxLat: 32.02, minLng: 34.76, maxLng: 34.83 },
  { city: 'tlv',          region: 'center',  minLat: 32.03, maxLat: 32.13, minLng: 34.74, maxLng: 34.82 },

  // ── North ────────────────────────────────────────────────────────────────
  { city: 'haifa',        region: 'north',   minLat: 32.76, maxLat: 32.84, minLng: 34.97, maxLng: 35.04 },

  // ── Center-East ──────────────────────────────────────────────────────────
  { city: 'jerusalem',    region: 'center',  minLat: 31.73, maxLat: 31.83, minLng: 35.17, maxLng: 35.25 },

  // ── South ────────────────────────────────────────────────────────────────
  { city: 'beer_sheva',   region: 'south',   minLat: 31.22, maxLat: 31.28, minLng: 34.77, maxLng: 34.83 },
  { city: 'ashdod',       region: 'south',   minLat: 31.78, maxLat: 31.83, minLng: 34.63, maxLng: 34.68 },
  { city: 'ashkelon',     region: 'south',   minLat: 31.65, maxLat: 31.70, minLng: 34.55, maxLng: 34.60 },
];

export const UNKNOWN_CITY: LocationSummary = { city: 'unknown', region: 'unknown' };

/** Hebrew display labels for admin UI. English keys stay stable for queries. */
export const CITY_LABELS_HE: Record<string, string> = {
  hadera: 'חדרה',
  netanya: 'נתניה',
  kfar_saba: 'כפר סבא',
  raanana: 'רעננה',
  herzliya: 'הרצליה',
  ramat_gan: 'רמת גן',
  petah_tikva: 'פתח תקווה',
  bat_yam: 'בת ים',
  rishon: 'ראשון לציון',
  tlv: 'תל אביב',
  haifa: 'חיפה',
  jerusalem: 'ירושלים',
  beer_sheva: 'באר שבע',
  ashdod: 'אשדוד',
  ashkelon: 'אשקלון',
  unknown: 'לא ידוע',
};
