import { validateProfessionKeys } from './professionValidation';

/**
 * Edge cases for what Gemini returns under us. These have all been seen in
 * the wild during dev — a runaway model returning 10 keys, an unknown
 * "drywaller" leaking into the UI, an empty array crashing the broadcast.
 * Each case must produce a non-empty list of valid keys.
 */
describe('validateProfessionKeys', () => {
  // ── Happy path ──────────────────────────────────────────────────────
  test('passes through a list of valid keys unchanged', () => {
    expect(validateProfessionKeys(['plumber', 'electrician'])).toEqual([
      'plumber',
      'electrician',
    ]);
  });

  test('preserves order — most relevant first', () => {
    expect(validateProfessionKeys(['electrician', 'handyman'])).toEqual([
      'electrician',
      'handyman',
    ]);
  });

  // ── Unknown keys get mapped to handyman ─────────────────────────────
  test('replaces unknown English-only key (drywaller) with handyman', () => {
    // The user reported "handyman drywaller" leaking into the UI because
    // 'drywaller' isn't in the matrix. Validator must catch it.
    expect(validateProfessionKeys(['drywaller'])).toEqual(['handyman']);
  });

  test('replaces a made-up key with handyman', () => {
    expect(validateProfessionKeys(['garbage_man'])).toEqual(['handyman']);
  });

  test('partially-valid mix keeps the good keys + falls back the bad', () => {
    const result = validateProfessionKeys(['plumber', 'fictional_trade']);
    expect(result).toContain('plumber');
    expect(result).toContain('handyman');
    expect(result).not.toContain('fictional_trade');
  });

  // ── Defensive cases ─────────────────────────────────────────────────
  test('empty array returns ["handyman"] (so broadcast still has a target)', () => {
    expect(validateProfessionKeys([])).toEqual(['handyman']);
  });

  test('null returns ["handyman"]', () => {
    expect(validateProfessionKeys(null)).toEqual(['handyman']);
  });

  test('undefined returns ["handyman"]', () => {
    expect(validateProfessionKeys(undefined)).toEqual(['handyman']);
  });

  test('non-array (string) returns ["handyman"]', () => {
    expect(validateProfessionKeys('plumber')).toEqual(['handyman']);
  });

  test('non-array (object) returns ["handyman"]', () => {
    expect(validateProfessionKeys({ profession: 'plumber' })).toEqual(['handyman']);
  });

  test('array with non-string entries (null) replaces them with handyman', () => {
    expect(validateProfessionKeys(['plumber', null, 5])).toEqual([
      'plumber',
      'handyman',
    ]);
  });

  // ── Dedup + cap ─────────────────────────────────────────────────────
  test('dedupes repeated keys, preserving first occurrence', () => {
    expect(
      validateProfessionKeys(['plumber', 'plumber', 'electrician']),
    ).toEqual(['plumber', 'electrician']);
  });

  test('runaway-model output is capped at 3 entries', () => {
    const tenKeys = [
      'plumber', 'electrician', 'painter', 'locksmith', 'handyman',
      'gas_technician', 'tiler', 'plasterer', 'glazier', 'carpenter',
    ];
    const result = validateProfessionKeys(tenKeys);
    expect(result).toHaveLength(3);
    // The first three (most relevant per model output) survive.
    expect(result).toEqual(['plumber', 'electrician', 'painter']);
  });

  test('runaway with all-unknown keys still produces a single handyman', () => {
    // After dedup, 5×'handyman' becomes 1×'handyman'. Cap is irrelevant.
    const allBad = ['x1', 'x2', 'x3', 'x4', 'x5'];
    expect(validateProfessionKeys(allBad)).toEqual(['handyman']);
  });
});
