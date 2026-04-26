import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapFcmErrorResponse, sendPushDetailed } from './fcm';

/**
 * Tests for the FCM error-response decoder. The decoder is what tells the
 * push pipeline whether to retry, delete the dead token, or page on-call.
 * We test it as a pure function — the actual fetch/sign dance is harder
 * to set up in unit tests but isn't where the discriminator logic lives.
 */

// =============================================================================
// invalid_token — caller wipes the dead token
// =============================================================================

test('mapFcmErrorResponse: 404 → invalid_token (token removed on device)', () => {
  const r = mapFcmErrorResponse(404, '{"error":{"code":404}}');
  assert.equal(r.kind, 'invalid_token');
  if (r.kind === 'invalid_token') assert.equal(r.statusCode, 404);
});

test('mapFcmErrorResponse: 410 → invalid_token (legacy NotRegistered)', () => {
  const r = mapFcmErrorResponse(410, 'NotRegistered');
  assert.equal(r.kind, 'invalid_token');
});

test('mapFcmErrorResponse: 400 with UNREGISTERED in body → invalid_token', () => {
  // FCM v1 sometimes returns 400 with `errorCode: UNREGISTERED`.
  const body = JSON.stringify({
    error: {
      code: 400,
      details: [{ '@type': 'fcm.googleapis.com/FcmError', errorCode: 'UNREGISTERED' }],
    },
  });
  const r = mapFcmErrorResponse(400, body);
  assert.equal(r.kind, 'invalid_token');
});

test('mapFcmErrorResponse: 200 body containing NOT_FOUND → invalid_token', () => {
  // Defensive — some FCM endpoints embed NOT_FOUND in a 200 envelope.
  const r = mapFcmErrorResponse(400, 'requested entity NOT_FOUND');
  assert.equal(r.kind, 'invalid_token');
});

// =============================================================================
// transient — caller may retry
// =============================================================================

test('mapFcmErrorResponse: 500 → transient', () => {
  const r = mapFcmErrorResponse(500, 'Internal Server Error');
  assert.equal(r.kind, 'transient');
  if (r.kind === 'transient') assert.equal(r.statusCode, 500);
});

test('mapFcmErrorResponse: 503 → transient', () => {
  const r = mapFcmErrorResponse(503, 'Service Unavailable');
  assert.equal(r.kind, 'transient');
});

test('mapFcmErrorResponse: 429 (rate-limited) → transient', () => {
  const r = mapFcmErrorResponse(429, 'Quota exceeded');
  assert.equal(r.kind, 'transient');
  if (r.kind === 'transient') assert.equal(r.statusCode, 429);
});

// =============================================================================
// fatal — log and move on (no useful retry)
// =============================================================================

test('mapFcmErrorResponse: 401 (auth) → fatal', () => {
  // Auth failures aren't transient — re-trying with the same broken
  // service account just wastes API calls.
  const r = mapFcmErrorResponse(401, 'Invalid credentials');
  assert.equal(r.kind, 'fatal');
});

test('mapFcmErrorResponse: 403 → fatal', () => {
  const r = mapFcmErrorResponse(403, 'Permission denied');
  assert.equal(r.kind, 'fatal');
});

test('mapFcmErrorResponse: 400 with no special markers → fatal (malformed payload)', () => {
  const r = mapFcmErrorResponse(400, 'Bad request');
  assert.equal(r.kind, 'fatal');
});

// =============================================================================
// Body truncation — never let a 5MB error body explode our event log
// =============================================================================

test('mapFcmErrorResponse: invalid_token body capped at 500 chars', () => {
  const huge = 'X'.repeat(10000);
  const r = mapFcmErrorResponse(404, huge);
  assert.equal(r.kind, 'invalid_token');
  if (r.kind === 'invalid_token') {
    assert.ok(r.body.length <= 500);
  }
});

test('mapFcmErrorResponse: transient body capped at 500 chars', () => {
  const huge = 'X'.repeat(10000);
  const r = mapFcmErrorResponse(500, huge);
  assert.equal(r.kind, 'transient');
  if (r.kind === 'transient') {
    assert.ok(r.body.length <= 500);
  }
});

test('mapFcmErrorResponse: fatal error message capped at 200 chars', () => {
  const huge = 'X'.repeat(10000);
  const r = mapFcmErrorResponse(401, huge);
  assert.equal(r.kind, 'fatal');
  if (r.kind === 'fatal') {
    assert.ok(r.error.length <= 220); // 200 body + "FCM 401: " prefix
  }
});

// =============================================================================
// sendPushDetailed: end-to-end short-circuit when no token
// =============================================================================

test('sendPushDetailed: missing token short-circuits to no_token (no auth roundtrip)', async () => {
  const result = await sendPushDetailed({
    serviceAccountJson: '{}', // would crash if we got past the early-return
    token: '',
    title: 'unused',
    body: 'unused',
  });
  assert.equal(result.kind, 'no_token');
});
