/**
 * Normalize a phone number to E.164 format with country code.
 * Handles Israeli numbers (default) and pre-formatted international numbers.
 *
 * Examples:
 *   "0501234567"     -> "+972501234567"   (10 digits starting with 0)
 *   "501234567"      -> "+972501234567"   (9 digits, no leading 0)
 *   "972501234567"   -> "+972501234567"   (already has country code)
 *   "+972501234567"  -> "+972501234567"   (already E.164)
 *   "054-833-6350"   -> "+972548336350"   (with separators)
 */

const DEFAULT_COUNTRY_CODE = '972'; // Israel

export function normalizePhoneNumber(input: string, countryCode: string = DEFAULT_COUNTRY_CODE): string {
  if (!input) return '';

  // Strip all non-digit characters except leading +
  const hasPlus = input.trim().startsWith('+');
  let digits = input.replace(/[^\d]/g, '');

  if (!digits) return '';

  // Already has country code (starts with +)
  if (hasPlus) {
    return `+${digits}`;
  }

  // Already starts with country code (e.g. 972501234567)
  if (digits.startsWith(countryCode)) {
    return `+${digits}`;
  }

  // Israeli format with leading 0 (10 digits: 0501234567)
  // Strip the leading 0 and prepend country code
  if (digits.length === 10 && digits.startsWith('0')) {
    return `+${countryCode}${digits.substring(1)}`;
  }

  // 9 digits without leading 0 (501234567)
  if (digits.length === 9) {
    return `+${countryCode}${digits}`;
  }

  // Fallback: assume local format, strip leading 0 if present
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  return `+${countryCode}${digits}`;
}

export function isValidPhoneNumber(input: string): boolean {
  if (!input) return false;
  // Must have at least 9 digits of the actual phone number (before normalization)
  const rawDigits = input.replace(/[^\d]/g, '');
  if (rawDigits.length < 9) return false;

  const normalized = normalizePhoneNumber(input);
  // E.164 format: + followed by 11-15 digits (country code + local)
  return /^\+\d{11,15}$/.test(normalized);
}

export function formatPhoneForDisplay(phoneE164: string): string {
  if (!phoneE164) return '';

  // Remove country code for display if Israeli
  if (phoneE164.startsWith('+972')) {
    const local = phoneE164.substring(4);
    // Format as 0XX-XXX-XXXX
    if (local.length === 9) {
      return `0${local.substring(0, 2)}-${local.substring(2, 5)}-${local.substring(5)}`;
    }
  }

  return phoneE164;
}
