/**
 * Canonical 2-hour availability windows. The provider picks ONE window
 * per quote; the customer sees the same range in their bid card. Same
 * windows are used by the broker's Gemini parser when a provider replies
 * via free-form WhatsApp text.
 *
 * Israel local time. Don't add windows past 21:00 — late-evening service
 * calls are rare and the picker wraps awkwardly with too many chips.
 */

export interface TimeWindow {
  /** Stable string key, used in serialization & i18n. */
  key: string;
  /** Israel local hour, 24h. */
  startHour: number;
  /** Israel local hour, 24h. */
  endHour: number;
}

export const TIME_WINDOWS: TimeWindow[] = [
  { key: 'w0700', startHour: 7,  endHour: 9 },
  { key: 'w0900', startHour: 9,  endHour: 11 },
  { key: 'w1100', startHour: 11, endHour: 13 },
  { key: 'w1300', startHour: 13, endHour: 15 },
  { key: 'w1500', startHour: 15, endHour: 17 },
  { key: 'w1700', startHour: 17, endHour: 19 },
  { key: 'w1900', startHour: 19, endHour: 21 },
] as const;

/** "09:00–11:00" — same render everywhere. */
export function formatWindowRange(w: TimeWindow): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(w.startHour)}:00\u2013${pad(w.endHour)}:00`;
}
