import { test } from 'node:test';
import assert from 'node:assert/strict';

// We test the pure helper internals by re-importing them. They're not
// exported so we dynamic-import via a different path... actually we'll
// just re-export them for testability via a ts-ignore trick, or better,
// export them explicitly below. For now, test what's exported.
//
// NOTE: formatNowForPrompt and isIsraelDst are private. Since Node's test
// runner has no good way to reach private functions without either
// exporting or monkeypatching, we test the behavior of parseProviderReply's
// output indirectly via a different mechanism — actually let's just
// export them from geminiParser.ts for testability.

import { __test__ } from './geminiParser';

const { formatNowForPrompt, isIsraelDst, validateIsoOrNull } = __test__;

// =============================================================================
// isIsraelDst
// =============================================================================

test('isIsraelDst: January is winter (no DST)', () => {
  assert.equal(isIsraelDst(new Date('2026-01-15T12:00:00Z')), false);
});

test('isIsraelDst: July is summer (DST active)', () => {
  assert.equal(isIsraelDst(new Date('2026-07-15T12:00:00Z')), true);
});

test('isIsraelDst: April is summer (DST active)', () => {
  assert.equal(isIsraelDst(new Date('2026-04-15T12:00:00Z')), true);
});

test('isIsraelDst: November is winter (no DST)', () => {
  assert.equal(isIsraelDst(new Date('2026-11-15T12:00:00Z')), false);
});

// =============================================================================
// formatNowForPrompt — must produce a stable, parseable string for Gemini
// =============================================================================

test('formatNowForPrompt: summer UTC 06:00 becomes Israel 09:00 (+3 DST)', () => {
  const now = new Date('2026-07-15T06:00:00Z'); // Wednesday
  const formatted = formatNowForPrompt(now);
  assert.match(formatted, /^2026-07-15 09:00 \(Wednesday, Israel time, UTC\+3\)$/);
});

test('formatNowForPrompt: winter UTC 07:00 becomes Israel 09:00 (+2 standard)', () => {
  const now = new Date('2026-01-15T07:00:00Z'); // Thursday
  const formatted = formatNowForPrompt(now);
  assert.match(formatted, /^2026-01-15 09:00 \(Thursday, Israel time, UTC\+2\)$/);
});

test('formatNowForPrompt: midnight rollover handled correctly', () => {
  // UTC 23:00 on July 14 → Israel 02:00 on July 15 (DST +3)
  const now = new Date('2026-07-14T23:00:00Z');
  const formatted = formatNowForPrompt(now);
  assert.match(formatted, /^2026-07-15 02:00 /);
});

// =============================================================================
// validateIsoOrNull — the tolerant ISO validator used on Gemini responses
// =============================================================================

test('validateIsoOrNull: valid ISO returns canonical form', () => {
  assert.equal(
    validateIsoOrNull('2026-04-10T09:00:00Z'),
    '2026-04-10T09:00:00.000Z'
  );
});

test('validateIsoOrNull: ISO with offset is converted to UTC', () => {
  assert.equal(
    validateIsoOrNull('2026-04-10T09:00:00+03:00'),
    '2026-04-10T06:00:00.000Z'
  );
});

test('validateIsoOrNull: garbage string returns null', () => {
  assert.equal(validateIsoOrNull('not a date'), null);
});

test('validateIsoOrNull: empty string returns null', () => {
  assert.equal(validateIsoOrNull(''), null);
});

test('validateIsoOrNull: null input returns null', () => {
  assert.equal(validateIsoOrNull(null), null);
});

test('validateIsoOrNull: undefined input returns null', () => {
  assert.equal(validateIsoOrNull(undefined), null);
});

test('validateIsoOrNull: number input returns null', () => {
  assert.equal(validateIsoOrNull(12345), null);
});
