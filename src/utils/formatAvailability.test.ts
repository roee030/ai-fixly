import { formatAvailability } from './formatAvailability';

/**
 * formatAvailability takes a bid's availability data and "now" and returns
 * a Hebrew string that ages gracefully.
 *
 * Rules:
 *   - If availabilityStartAt is null/undefined → fall back to raw text, or "בקרוב"
 *   - If the stored time is in the PAST → "כבר היה להגיע" (overdue marker)
 *   - Same day as now → "היום HH:MM"
 *   - Next day → "מחר HH:MM"
 *   - Within 6 days → "יום X HH:MM" (Sunday–Saturday in Hebrew)
 *   - More than 6 days → "DD/MM HH:MM"
 *
 * Times are shown in Israel local wall-clock (the ISO is UTC, we shift).
 * Tests pin all dates/times explicitly so we don't depend on the host TZ.
 */

// Helper: construct an ISO string from Israel wall-clock components (summer DST).
function israelSummer(year: number, m: number, d: number, h: number, min: number): string {
  // Israel DST offset = UTC+3, so to get UTC we subtract 3 hours
  const utc = new Date(Date.UTC(year, m - 1, d, h - 3, min));
  return utc.toISOString();
}

function israelWinter(year: number, m: number, d: number, h: number, min: number): string {
  // Israel standard offset = UTC+2, so to get UTC we subtract 2 hours
  const utc = new Date(Date.UTC(year, m - 1, d, h - 2, min));
  return utc.toISOString();
}

describe('formatAvailability', () => {
  // Anchor: Wednesday 2026-07-15 10:00 Israel time (summer DST) = 07:00 UTC
  const nowSummer = new Date(israelSummer(2026, 7, 15, 10, 0));

  describe('same day (today)', () => {
    it('shows "היום HH:MM" for later today', () => {
      const iso = israelSummer(2026, 7, 15, 15, 30); // 15:30 Israel same day
      expect(
        formatAvailability({ availabilityStartAt: iso, availability: 'אחה"צ' }, nowSummer)
      ).toBe('היום 15:30');
    });

    it('shows "היום HH:MM" even at the edge of the day', () => {
      const iso = israelSummer(2026, 7, 15, 23, 0);
      expect(
        formatAvailability({ availabilityStartAt: iso, availability: null }, nowSummer)
      ).toBe('היום 23:00');
    });
  });

  describe('next day (tomorrow)', () => {
    it('shows "מחר HH:MM"', () => {
      const iso = israelSummer(2026, 7, 16, 9, 0);
      expect(
        formatAvailability({ availabilityStartAt: iso, availability: 'בבוקר' }, nowSummer)
      ).toBe('מחר 09:00');
    });

    it('pads single-digit hours correctly', () => {
      const iso = israelSummer(2026, 7, 16, 8, 5);
      expect(
        formatAvailability({ availabilityStartAt: iso, availability: null }, nowSummer)
      ).toBe('מחר 08:05');
    });
  });

  describe('within a week', () => {
    it('shows "יום X HH:MM" for 3 days ahead (Saturday)', () => {
      // Wed 15 → Sat 18 is 3 days
      const iso = israelSummer(2026, 7, 18, 14, 0);
      expect(
        formatAvailability({ availabilityStartAt: iso, availability: null }, nowSummer)
      ).toBe('יום שבת 14:00');
    });

    it('shows "יום X HH:MM" for next Sunday', () => {
      // Wed 15 → Sun 19 is 4 days
      const iso = israelSummer(2026, 7, 19, 10, 0);
      expect(
        formatAvailability({ availabilityStartAt: iso, availability: null }, nowSummer)
      ).toBe('יום ראשון 10:00');
    });

    it('shows "יום X HH:MM" for 6 days ahead (Tuesday)', () => {
      const iso = israelSummer(2026, 7, 21, 10, 0);
      expect(
        formatAvailability({ availabilityStartAt: iso, availability: null }, nowSummer)
      ).toBe('יום שלישי 10:00');
    });
  });

  describe('more than a week away', () => {
    it('shows "DD/MM HH:MM" for 10 days ahead', () => {
      const iso = israelSummer(2026, 7, 25, 14, 30);
      expect(
        formatAvailability({ availabilityStartAt: iso, availability: null }, nowSummer)
      ).toBe('25/07 14:30');
    });
  });

  describe('past availability (overdue)', () => {
    it('shows "עבר" for a time in the past', () => {
      const iso = israelSummer(2026, 7, 14, 18, 0); // yesterday
      expect(
        formatAvailability({ availabilityStartAt: iso, availability: null }, nowSummer)
      ).toBe('עבר');
    });

    it('shows "עבר" for an hour ago today', () => {
      const iso = israelSummer(2026, 7, 15, 9, 0); // 9am, now is 10am
      expect(
        formatAvailability({ availabilityStartAt: iso, availability: null }, nowSummer)
      ).toBe('עבר');
    });
  });

  describe('fallback when availabilityStartAt missing', () => {
    it('returns raw availability text when present', () => {
      expect(
        formatAvailability({ availabilityStartAt: null, availability: 'מחר אחה"צ' }, nowSummer)
      ).toBe('מחר אחה"צ');
    });

    it('returns "בקרוב" when both are missing', () => {
      expect(
        formatAvailability({ availabilityStartAt: null, availability: null }, nowSummer)
      ).toBe('בקרוב');
    });

    it('returns raw text when ISO is invalid garbage', () => {
      expect(
        formatAvailability(
          { availabilityStartAt: 'not a date', availability: 'היום' },
          nowSummer
        )
      ).toBe('היום');
    });
  });

  describe('winter / DST boundary', () => {
    it('handles winter (UTC+2) correctly', () => {
      // Monday 2026-01-12 10:00 Israel time = 08:00 UTC
      const nowWinter = new Date(israelWinter(2026, 1, 12, 10, 0));
      const iso = israelWinter(2026, 1, 13, 9, 0);
      expect(
        formatAvailability({ availabilityStartAt: iso, availability: null }, nowWinter)
      ).toBe('מחר 09:00');
    });
  });
});
