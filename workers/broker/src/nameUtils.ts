/**
 * Shorten a provider's full business name for display on bid cards.
 *
 * Before the customer selects a provider, we show a shortened name to
 * prevent them from Googling the business and bypassing the platform.
 * After selection, the full name + phone are revealed.
 *
 * Rule: strip suffixes (בע"מ, LTD, |, phone numbers), take first 2
 * meaningful words, truncate at 20 chars if needed.
 */

const STRIP_PATTERNS: RegExp[] = [
  /\s*\|.*/,                         // everything after first |
  /\s*בע"מ\s*/gi,                   // בע"מ
  /\s*בע\u05F4מ\s*/gi,              // בע״מ (Hebrew gershayim ״)
  /\s*בע['"]מ\s*/gi,               // variations
  /\s*LTD\.?\s*/gi,                 // LTD
  /\s*INC\.?\s*/gi,                 // INC
  /\s*0\d{1,2}-?\d{3,}-?\d{3,}/g,  // Israeli phone numbers
  /\s*\+\d{10,}/g,                  // international phone numbers
  /\s*-\s*$/,                       // trailing dashes
];

const MAX_DISPLAY_LENGTH = 20;
const FALLBACK_NAME = 'בעל מקצוע';

export function shortenProviderName(fullName: string | null | undefined): string {
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    return FALLBACK_NAME;
  }

  let cleaned = fullName.trim();

  for (const pattern of STRIP_PATTERNS) {
    cleaned = cleaned.replace(pattern, '').trim();
  }

  if (cleaned.length === 0) return FALLBACK_NAME;

  // Title-case all-caps English names (ELITE PLUMBING → Elite Plumbing)
  if (/^[A-Z\s]+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\b[A-Z]+\b/g, (w) =>
      w.charAt(0) + w.slice(1).toLowerCase()
    );
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  const short = words.slice(0, 2).join(' ');

  if (short.length === 0) return FALLBACK_NAME;

  if (short.length > MAX_DISPLAY_LENGTH) {
    return short.slice(0, MAX_DISPLAY_LENGTH) + '\u2026';
  }

  return short;
}
