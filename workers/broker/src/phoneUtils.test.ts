import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLikelyWhatsAppCapable, normalizeIsraeliPhone } from './phoneUtils';

// =============================================================================
// normalizeIsraeliPhone — strip spaces, dashes, dots; convert 0XX to +972XX
// =============================================================================

test('normalizeIsraeliPhone: E.164 input passes through unchanged', () => {
  assert.equal(normalizeIsraeliPhone('+972501234567'), '+972501234567');
});

test('normalizeIsraeliPhone: strips spaces and dashes', () => {
  assert.equal(normalizeIsraeliPhone('+972 50-123-4567'), '+972501234567');
});

test('normalizeIsraeliPhone: strips parentheses and dots', () => {
  assert.equal(normalizeIsraeliPhone('(050) 123.4567'), '+972501234567');
});

test('normalizeIsraeliPhone: converts 0-prefix to +972', () => {
  assert.equal(normalizeIsraeliPhone('050-123-4567'), '+972501234567');
});

test('normalizeIsraeliPhone: empty string returns empty', () => {
  assert.equal(normalizeIsraeliPhone(''), '');
});

test('normalizeIsraeliPhone: non-Israeli international number passes through', () => {
  // UK mobile — not our concern, don't mangle it
  assert.equal(normalizeIsraeliPhone('+447911123456'), '+447911123456');
});

// =============================================================================
// isLikelyWhatsAppCapable — heuristic: is this number a mobile that
// probably has WhatsApp? Landlines and service numbers should return false.
// =============================================================================

test('isLikelyWhatsAppCapable: Israeli mobile 050 is true', () => {
  assert.equal(isLikelyWhatsAppCapable('+972501234567'), true);
});

test('isLikelyWhatsAppCapable: Israeli mobile 052 is true', () => {
  assert.equal(isLikelyWhatsAppCapable('+972521234567'), true);
});

test('isLikelyWhatsAppCapable: Israeli mobile 053 is true', () => {
  assert.equal(isLikelyWhatsAppCapable('+972531234567'), true);
});

test('isLikelyWhatsAppCapable: Israeli mobile 054 is true', () => {
  assert.equal(isLikelyWhatsAppCapable('+972541234567'), true);
});

test('isLikelyWhatsAppCapable: Israeli mobile 055 is true', () => {
  assert.equal(isLikelyWhatsAppCapable('+972551234567'), true);
});

test('isLikelyWhatsAppCapable: Israeli mobile 058 is true', () => {
  assert.equal(isLikelyWhatsAppCapable('+972581234567'), true);
});

test('isLikelyWhatsAppCapable: Tel Aviv landline 03 is false', () => {
  assert.equal(isLikelyWhatsAppCapable('+97231234567'), false);
});

test('isLikelyWhatsAppCapable: Jerusalem landline 02 is false', () => {
  assert.equal(isLikelyWhatsAppCapable('+97221234567'), false);
});

test('isLikelyWhatsAppCapable: Haifa landline 04 is false', () => {
  assert.equal(isLikelyWhatsAppCapable('+97241234567'), false);
});

test('isLikelyWhatsAppCapable: Israeli service number 1800 is false', () => {
  assert.equal(isLikelyWhatsAppCapable('+9721800123456'), false);
});

test('isLikelyWhatsAppCapable: Israeli short premium *1234 is false', () => {
  assert.equal(isLikelyWhatsAppCapable('+9721234'), false);
});

test('isLikelyWhatsAppCapable: accepts unnormalized local format 054-...', () => {
  // Should normalize internally before checking
  assert.equal(isLikelyWhatsAppCapable('054-123-4567'), true);
});

// Regression guard for the googlePlaces integration: local Israeli landline
// in un-normalized form must be rejected, not pass through as "unknown foreign".
test('isLikelyWhatsAppCapable: unnormalized Israeli landline 03-... is false', () => {
  assert.equal(isLikelyWhatsAppCapable('03-1234567'), false);
});

test('isLikelyWhatsAppCapable: unnormalized Israeli landline 02-... is false', () => {
  assert.equal(isLikelyWhatsAppCapable('02-1234567'), false);
});

test('isLikelyWhatsAppCapable: unnormalized Israeli 1800 service number is false', () => {
  assert.equal(isLikelyWhatsAppCapable('1800-123-456'), false);
});

test('isLikelyWhatsAppCapable: empty string is false', () => {
  assert.equal(isLikelyWhatsAppCapable(''), false);
});

test('isLikelyWhatsAppCapable: null-like input is false', () => {
  // Defensively handle garbage
  assert.equal(isLikelyWhatsAppCapable('abc'), false);
});

test('isLikelyWhatsAppCapable: non-Israeli number defaults to true', () => {
  // Conservative: if we can't tell, assume capable. Twilio will catch
  // the real failures on send.
  assert.equal(isLikelyWhatsAppCapable('+447911123456'), true);
});

test('isLikelyWhatsAppCapable: non-Israeli landline-looking number defaults to true', () => {
  // Same rationale — only Israeli numbers have a reliable prefix heuristic.
  assert.equal(isLikelyWhatsAppCapable('+12125551234'), true);
});
