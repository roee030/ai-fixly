/**
 * Renders a bid's availability as a localized human-friendly string that
 * stays accurate as time passes. The bid carries a canonical UTC ISO
 * timestamp (availabilityStartAt) computed by Gemini when the provider
 * replied; this helper converts that to human-friendly relative text
 * based on "now" in Israel local time.
 *
 * Cases:
 *   - Past time        → t('availability.past')
 *   - Same Israel-day  → t('availability.today', { time: 'HH:MM' })
 *   - Next day         → t('availability.tomorrow', { time })
 *   - Within a week    → t('availability.dayAtTime', { day, time })
 *   - Further out      → "DD/MM HH:MM" (absolute)
 *   - No ISO           → raw text fallback, or t('availability.soon')
 *
 * Accepts an optional `t` function so the util stays pure and testable.
 * When `t` is omitted, falls back to Hebrew literals (backwards compat).
 */

type TFunction = (key: string, opts?: Record<string, any>) => string;

export interface BidAvailability {
  availabilityStartAt?: string | null;
  availability?: string | null;
}

// Hebrew fallback — used only when no t() is passed (tests, legacy calls).
const HE_DAYS = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
const HE_FALLBACK = {
  past: 'עבר',
  soon: 'בקרוב',
  today: (time: string) => `היום ${time}`,
  tomorrow: (time: string) => `מחר ${time}`,
  dayAtTime: (day: string, time: string) => `${day} ${time}`,
};

export function formatAvailability(bid: BidAvailability, now: Date, t?: TFunction): string {
  const soon = t ? t('availability.soon') : HE_FALLBACK.soon;
  const past = t ? t('availability.past') : HE_FALLBACK.past;

  const iso = bid.availabilityStartAt;
  if (!iso) return bid.availability || soon;

  const target = new Date(iso);
  if (isNaN(target.getTime())) return bid.availability || soon;

  // Past time → overdue marker
  if (target.getTime() <= now.getTime()) return past;

  // Work in Israel local wall-clock.
  const offsetMs = israelOffsetHours(target) * 60 * 60 * 1000;
  const targetIsrael = new Date(target.getTime() + offsetMs);
  const nowIsrael = new Date(now.getTime() + israelOffsetHours(now) * 60 * 60 * 1000);

  const msPerDay = 24 * 60 * 60 * 1000;
  const dayDiff = Math.round(
    (startOfDayUtcParts(targetIsrael) - startOfDayUtcParts(nowIsrael)) / msPerDay,
  );

  const hh = String(targetIsrael.getUTCHours()).padStart(2, '0');
  const mm = String(targetIsrael.getUTCMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;

  if (dayDiff === 0) {
    return t ? t('availability.today', { time }) : HE_FALLBACK.today(time);
  }
  if (dayDiff === 1) {
    return t ? t('availability.tomorrow', { time }) : HE_FALLBACK.tomorrow(time);
  }
  if (dayDiff >= 2 && dayDiff <= 6) {
    const dayIdx = targetIsrael.getUTCDay();
    const day = t ? t(`availability.day_${dayIdx}`) : HE_DAYS[dayIdx];
    return t ? t('availability.dayAtTime', { day, time }) : HE_FALLBACK.dayAtTime(day, time);
  }

  // More than 6 days out — absolute short date (no locale needed).
  const dayOfMonth = String(targetIsrael.getUTCDate()).padStart(2, '0');
  const month = String(targetIsrael.getUTCMonth() + 1).padStart(2, '0');
  return `${dayOfMonth}/${month} ${time}`;
}

/**
 * Israel DST offset in hours (+3 summer, +2 winter). Month-based
 * approximation matching the worker's formatNowForPrompt.
 */
function israelOffsetHours(d: Date): number {
  const month = d.getUTCMonth();
  if (month < 2 || month > 9) return 2;
  if (month > 2 && month < 9) return 3;
  const inSummer = month === 2 ? d.getUTCDate() >= 25 : d.getUTCDate() < 25;
  return inSummer ? 3 : 2;
}

function startOfDayUtcParts(shifted: Date): number {
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}
