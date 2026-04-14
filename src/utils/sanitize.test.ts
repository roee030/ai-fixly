import { sanitizeText, sanitizePhone, sanitizeEmail, sanitizeNumeric } from './sanitize';

describe('sanitizeText', () => {
  test('removes HTML tags', () => {
    expect(sanitizeText('<b>hello</b>')).toBe('hello');
  });
  test('removes script tags', () => {
    expect(sanitizeText('text<script>alert("xss")</script>more')).toBe('textmore');
  });
  test('removes javascript: URLs', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)');
  });
  test('removes event handlers', () => {
    expect(sanitizeText('text onload=alert(1) more')).toBe('text alert(1) more');
  });
  test('enforces max length', () => {
    expect(sanitizeText('a'.repeat(3000), 100).length).toBe(100);
  });
  test('handles empty input', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText(null as any)).toBe('');
  });
  test('preserves Hebrew text', () => {
    expect(sanitizeText('\u05E9\u05DC\u05D5\u05DD \u05E2\u05D5\u05DC\u05DD')).toBe('\u05E9\u05DC\u05D5\u05DD \u05E2\u05D5\u05DC\u05DD');
  });
});

describe('sanitizePhone', () => {
  test('keeps valid phone', () => {
    expect(sanitizePhone('+972-54-123-4567')).toBe('+972-54-123-4567');
  });
  test('strips invalid chars', () => {
    expect(sanitizePhone('054<script>1234567')).toBe('0541234567');
  });
  test('enforces max length', () => {
    expect(sanitizePhone('1'.repeat(30)).length).toBeLessThanOrEqual(20);
  });
});

describe('sanitizeEmail', () => {
  test('valid email passes', () => {
    expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
  });
  test('invalid email returns empty', () => {
    expect(sanitizeEmail('not-an-email')).toBe('');
  });
  test('lowercases', () => {
    expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
  });
});

describe('sanitizeNumeric', () => {
  test('keeps only digits', () => {
    expect(sanitizeNumeric('350 \u05E9"\u05D7')).toBe('350');
  });
  test('empty input', () => {
    expect(sanitizeNumeric('')).toBe('');
  });
});
