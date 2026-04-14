import { isInServiceZone } from './geoFence';

describe('isInServiceZone', () => {
  // Inside the zone
  test('Hadera center is in zone', () => {
    expect(isInServiceZone(32.45, 34.92)).toBe(true);
  });
  test('Caesarea is in zone', () => {
    expect(isInServiceZone(32.50, 34.89)).toBe(true);
  });
  test('Or Akiva is in zone', () => {
    expect(isInServiceZone(32.51, 34.92)).toBe(true);
  });
  test('Netanya (north part) is in zone', () => {
    expect(isInServiceZone(32.33, 34.86)).toBe(true);
  });
  test('Pardes Hanna is in zone', () => {
    expect(isInServiceZone(32.47, 34.97)).toBe(true);
  });
  test('Binyamina is in zone', () => {
    expect(isInServiceZone(32.52, 34.95)).toBe(true);
  });

  // Outside the zone
  test('Tel Aviv is NOT in zone', () => {
    expect(isInServiceZone(32.08, 34.78)).toBe(false);
  });
  test('Haifa is NOT in zone', () => {
    expect(isInServiceZone(32.80, 35.00)).toBe(false);
  });
  test('Jerusalem is NOT in zone', () => {
    expect(isInServiceZone(31.77, 35.23)).toBe(false);
  });
  test('Beer Sheva is NOT in zone', () => {
    expect(isInServiceZone(31.25, 34.79)).toBe(false);
  });
  test('Eilat is NOT in zone', () => {
    expect(isInServiceZone(29.56, 34.95)).toBe(false);
  });

  // Edge cases
  test('exactly at radius boundary (20km)', () => {
    // ~20km south of center is approximately 32.27 lat
    // This should be right at the edge — test that the function doesn't crash
    const result = isInServiceZone(32.27, 34.92);
    expect(typeof result).toBe('boolean');
  });
});
