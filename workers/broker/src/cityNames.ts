/**
 * English → Hebrew translation for the most common Israeli cities.
 *
 * The app's `Location.reverseGeocodeAsync` returns city names in the device
 * locale — so customers on an English-language phone send us "Hadera"
 * instead of "חדרה". The provider-side forms (and the WhatsApp message we
 * send to providers) are Hebrew-first, so we normalise the name server-side
 * before displaying it.
 *
 * Keys are lowercased for case-insensitive lookup. Unknown names pass
 * through unchanged — better to show an untranslated "Pardes Hanna" than
 * an empty string.
 */
export const EN_TO_HE_CITY: Record<string, string> = {
  'tel aviv': 'תל אביב',
  'tel aviv-yafo': 'תל אביב',
  'jerusalem': 'ירושלים',
  'haifa': 'חיפה',
  'rishon lezion': 'ראשון לציון',
  'rishon le tsiyon': 'ראשון לציון',
  'petah tikva': 'פתח תקווה',
  'petach tikva': 'פתח תקווה',
  'ashdod': 'אשדוד',
  'netanya': 'נתניה',
  "be'er sheva": 'באר שבע',
  'beer sheva': 'באר שבע',
  'bnei brak': 'בני ברק',
  'holon': 'חולון',
  'ramat gan': 'רמת גן',
  'rehovot': 'רחובות',
  'herzliya': 'הרצליה',
  'kfar saba': 'כפר סבא',
  'modiin': 'מודיעין',
  "modi'in": 'מודיעין',
  'raanana': 'רעננה',
  'ashkelon': 'אשקלון',
  'bat yam': 'בת ים',
  'lod': 'לוד',
  'nazareth': 'נצרת',
  'ramla': 'רמלה',
  'eilat': 'אילת',
  'afula': 'עפולה',
  'tiberias': 'טבריה',
  'hadera': 'חדרה',
  'kiryat ata': 'קריית אתא',
  'kiryat gat': 'קריית גת',
  'givatayim': 'גבעתיים',
  'nahariya': 'נהריה',
};

function looksEnglish(s: string): boolean {
  return /^[\x20-\x7E]+$/.test(s);
}

export function normaliseCityName(raw: string): string {
  if (!raw) return raw;
  if (!looksEnglish(raw)) return raw;
  const key = raw.toLowerCase();
  return EN_TO_HE_CITY[key] || raw;
}
