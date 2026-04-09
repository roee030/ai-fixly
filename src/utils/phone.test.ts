import { normalizePhoneNumber, isValidPhoneNumber, formatPhoneForDisplay } from './phone';

describe('normalizePhoneNumber', () => {
  it('handles 10-digit Israeli with leading 0', () => {
    expect(normalizePhoneNumber('0501234567')).toBe('+972501234567');
  });

  it('handles 9-digit Israeli without leading 0', () => {
    expect(normalizePhoneNumber('501234567')).toBe('+972501234567');
  });

  it('handles already E.164 format', () => {
    expect(normalizePhoneNumber('+972501234567')).toBe('+972501234567');
  });

  it('handles country code without plus', () => {
    expect(normalizePhoneNumber('972501234567')).toBe('+972501234567');
  });

  it('strips separators (dashes, spaces, parens)', () => {
    expect(normalizePhoneNumber('054-833-6350')).toBe('+972548336350');
    expect(normalizePhoneNumber('054 833 6350')).toBe('+972548336350');
    expect(normalizePhoneNumber('(054) 833-6350')).toBe('+972548336350');
  });

  it('returns empty for empty input', () => {
    expect(normalizePhoneNumber('')).toBe('');
    expect(normalizePhoneNumber('   ')).toBe('');
  });
});

describe('isValidPhoneNumber', () => {
  it('accepts valid Israeli numbers in all formats', () => {
    expect(isValidPhoneNumber('0501234567')).toBe(true);
    expect(isValidPhoneNumber('501234567')).toBe(true);
    expect(isValidPhoneNumber('+972501234567')).toBe(true);
    expect(isValidPhoneNumber('054-833-6350')).toBe(true);
  });

  it('rejects too short numbers', () => {
    expect(isValidPhoneNumber('12345')).toBe(false);
  });

  it('rejects empty', () => {
    expect(isValidPhoneNumber('')).toBe(false);
  });
});

describe('formatPhoneForDisplay', () => {
  it('formats Israeli number with dashes', () => {
    expect(formatPhoneForDisplay('+972548336350')).toBe('054-833-6350');
  });

  it('returns as-is for empty', () => {
    expect(formatPhoneForDisplay('')).toBe('');
  });
});
