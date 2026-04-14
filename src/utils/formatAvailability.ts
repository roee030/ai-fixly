/**
 * Renders a bid's availability as a Hebrew string that stays accurate as
 * time passes. The bid carries a canonical UTC ISO timestamp
 * (availabilityStartAt) computed by Gemini when the provider replied;
 * this helper converts that to human-friendly relative text based on
 * "now" in Israel local time.
 *
 * Cases:
 *   - Past time → "עבר"
 *   - Same Israel-day as now → "היום HH:MM"
 *   - Next day → "מחר HH:MM"
 *   - Within a week → "יום X HH:MM" (Hebrew day name)
 *   - Further out → "DD/MM HH:MM"
 *   - No ISO → raw text fallback, or "בקרוב" if nothing at all
 */

export interface BidAvailability {
  availabilityStartAt?: string | null;
  availability?: string | null;
}

const HEBREW_DAYS = [
  'יום ראשון', // 0 = Sunday
  'יום שני',
  'יום שלישי',
  'יום רביעי',
  'יום חמישי',
  'יום שישי',
  'יום שבת',
];

export function formatAvailability(bid: BidAvailability, now: Date): string {
  const iso = bid.availabilityStartAt;
  if (!iso) {
    return bid.availability || 'בקרוב';
  }

  const target = new Date(iso);
  if (isNaN(target.getTime())) {
    return bid.availability || 'בקרוב';
  }

  // Past time → overdue marker
  if (target.getTime() <= now.getTime()) {
    return 'עבר';
  }

  // Work in Israel local wall-clock. Shift both dates by the Israel offset
  // (DST-aware) so getUTC*() methods return Israel-local components.
  const offsetMs = israelOffsetHours(target) * 60 * 60 * 1000;
  const targetIsrael = new Date(target.getTime() + offsetMs);
  const nowIsrael = new Date(now.getTime() + israelOffsetHours(now) * 60 * 60 * 1000);

  const targetDayStart = startOfDayUtcParts(targetIsrael);
  const nowDayStart = startOfDayUtcParts(nowIsrael);
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayDiff = Math.round((targetDayStart - nowDayStart) / msPerDay);

  const hh = String(targetIsrael.getUTCHours()).padStart(2, '0');
  const mm = String(targetIsrael.getUTCMinutes()).padStart(2, '0');

  if (dayDiff === 0) {
    return `היום ${hh}:${mm}`;
  }
  if (dayDiff === 1) {
    return `מחר ${hh}:${mm}`;
  }
  if (dayDiff >= 2 && dayDiff <= 6) {
    const dayName = HEBREW_DAYS[targetIsrael.getUTCDay()];
    return `${dayName} ${hh}:${mm}`;
  }

  // More than 6 days out — show an absolute short date
  const dayOfMonth = String(targetIsrael.getUTCDate()).padStart(2, '0');
  const month = String(targetIsrael.getUTCMonth() + 1).padStart(2, '0');
  return `${dayOfMonth}/${month} ${hh}:${mm}`;
}

/**
 * Israel DST offset in hours (+3 summer, +2 winter). Month-based
 * approximation matching the worker's formatNowForPrompt.
 */
function israelOffsetHours(d: Date): number {
  const month = d.getUTCMonth();
  if (month < 2 || month > 9) return 2;
  if (month > 2 && month < 9) return 3;
  // March/October edges
  const inSummer = month === 2 ? d.getUTCDate() >= 25 : d.getUTCDate() < 25;
  return inSummer ? 3 : 2;
}

/**
 * Convert a shifted-Israel Date into the UTC timestamp of midnight
 * of its "Israel day". Used for computing day-difference.
 */
function startOfDayUtcParts(shifted: Date): number {
  return Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );
}
