import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanonicalString,
  computeTwilioSignature,
  verifyTwilioSignature,
} from './twilioSignature';

// =============================================================================
// buildCanonicalString — Twilio's exact rule: URL + sorted(key+value), no sep
// =============================================================================

test('buildCanonicalString: empty form data returns just the URL', () => {
  const fd = new FormData();
  assert.equal(
    buildCanonicalString('https://example.com/webhook', fd),
    'https://example.com/webhook',
  );
});

test('buildCanonicalString: single param appended as key+value', () => {
  const fd = new FormData();
  fd.append('From', '+972501234567');
  assert.equal(
    buildCanonicalString('https://example.com/webhook', fd),
    'https://example.com/webhookFrom+972501234567',
  );
});

test('buildCanonicalString: multiple params sorted alphabetically by key', () => {
  // Twilio sorts BEFORE concatenating — so the order in which we iterate
  // FormData must not affect the canonical string. This is what trips up
  // most implementations.
  const fd = new FormData();
  fd.append('To', 'whatsapp:+972...');
  fd.append('From', 'whatsapp:+972...');
  fd.append('Body', 'price 350');

  const canonical = buildCanonicalString('https://example.com/webhook', fd);
  assert.equal(
    canonical,
    'https://example.com/webhookBodyprice 350Fromwhatsapp:+972...Towhatsapp:+972...',
  );
});

test('buildCanonicalString: unicode bodies (Hebrew) round-trip cleanly', () => {
  const fd = new FormData();
  fd.append('Body', 'מחר 14:00');
  fd.append('From', 'whatsapp:+972501234567');
  const canonical = buildCanonicalString('https://example.com/webhook', fd);
  assert.ok(canonical.includes('Bodyמחר 14:00'));
  assert.ok(canonical.includes('Fromwhatsapp:+972501234567'));
});

// =============================================================================
// computeTwilioSignature + verifyTwilioSignature — round-trip
// =============================================================================

test('round-trip: a signature we compute also verifies', async () => {
  const fd = new FormData();
  fd.append('From', 'whatsapp:+972501234567');
  fd.append('Body', 'מחר 14:00, 350 שח');

  const url = 'https://broker.workers.dev/webhook/twilio';
  const token = 'fake-auth-token-for-test';

  const signature = await computeTwilioSignature(url, fd, token);
  assert.equal(typeof signature, 'string');
  assert.ok(signature.length > 0);

  const valid = await verifyTwilioSignature(url, fd, token, signature);
  assert.equal(valid, true);
});

test('verifyTwilioSignature: rejects when header is missing', async () => {
  const fd = new FormData();
  fd.append('From', 'whatsapp:+972501234567');
  const valid = await verifyTwilioSignature(
    'https://broker.workers.dev/webhook/twilio',
    fd,
    'token',
    null,
  );
  assert.equal(valid, false);
});

test('verifyTwilioSignature: rejects when header is empty string', async () => {
  const fd = new FormData();
  const valid = await verifyTwilioSignature(
    'https://broker.workers.dev/webhook/twilio',
    fd,
    'token',
    '',
  );
  assert.equal(valid, false);
});

test('verifyTwilioSignature: rejects an obviously fake signature', async () => {
  const fd = new FormData();
  fd.append('From', 'whatsapp:+972501234567');
  fd.append('Body', 'price 350');

  const valid = await verifyTwilioSignature(
    'https://broker.workers.dev/webhook/twilio',
    fd,
    'real-auth-token',
    'aGVsbG8gd29ybGQgaGVsbG8gaGVsbG8gaGVsbG8h', // 28 chars, base64ish, but wrong
  );
  assert.equal(valid, false);
});

test('verifyTwilioSignature: rejects when the wrong auth token is used', async () => {
  // Attacker has the URL + body but not our auth token. Their forged
  // signature (computed with a different token) must fail verification.
  const fd = new FormData();
  fd.append('From', 'whatsapp:+972501234567');
  fd.append('Body', 'price 350, מחר');

  const url = 'https://broker.workers.dev/webhook/twilio';

  const attackerSig = await computeTwilioSignature(url, fd, 'attackers-guess');
  const valid = await verifyTwilioSignature(url, fd, 'real-token', attackerSig);
  assert.equal(valid, false);
});

test('verifyTwilioSignature: rejects when the body is tampered with', async () => {
  // Compute a real signature for a benign body, then attempt verification
  // against a tampered body — must fail.
  const url = 'https://broker.workers.dev/webhook/twilio';
  const token = 'shared-secret';

  const original = new FormData();
  original.append('From', 'whatsapp:+972501234567');
  original.append('Body', 'I will be there at 9am');
  const originalSig = await computeTwilioSignature(url, original, token);

  // Attacker swaps the body but reuses the original signature.
  const tampered = new FormData();
  tampered.append('From', 'whatsapp:+972501234567');
  tampered.append('Body', 'cancel the job');

  const valid = await verifyTwilioSignature(url, tampered, token, originalSig);
  assert.equal(valid, false);
});

test('verifyTwilioSignature: rejects when URL is tampered with', async () => {
  // Twilio bakes the URL into the signature, so a request replayed at a
  // different path must fail even if body + token are unchanged.
  const fd = new FormData();
  fd.append('From', 'whatsapp:+972501234567');
  fd.append('Body', 'ok');

  const token = 'shared-secret';
  const sig = await computeTwilioSignature(
    'https://broker.workers.dev/webhook/twilio',
    fd,
    token,
  );

  const valid = await verifyTwilioSignature(
    'https://broker.workers.dev/webhook/admin', // different path!
    fd,
    token,
    sig,
  );
  assert.equal(valid, false);
});

test('verifyTwilioSignature: param order does NOT affect verification', async () => {
  // FormData iteration order can differ between runtimes; the canonical
  // string sorts internally so the same set of params produces the same
  // signature regardless of insertion order.
  const url = 'https://broker.workers.dev/webhook/twilio';
  const token = 'shared-secret';

  const fd1 = new FormData();
  fd1.append('From', 'a');
  fd1.append('To', 'b');
  fd1.append('Body', 'c');

  const fd2 = new FormData();
  fd2.append('Body', 'c');
  fd2.append('To', 'b');
  fd2.append('From', 'a');

  const sig1 = await computeTwilioSignature(url, fd1, token);
  const sig2 = await computeTwilioSignature(url, fd2, token);
  assert.equal(sig1, sig2);

  // Either FormData verifies against either signature.
  assert.equal(await verifyTwilioSignature(url, fd1, token, sig2), true);
  assert.equal(await verifyTwilioSignature(url, fd2, token, sig1), true);
});

test('verifyTwilioSignature: empty form data still verifies (Twilio status callbacks)', async () => {
  // Twilio's MessageStatus callbacks sometimes carry no params worth
  // signing; the signature is computed against the URL alone.
  const url = 'https://broker.workers.dev/webhook/twilio';
  const token = 'shared-secret';
  const fd = new FormData();
  const sig = await computeTwilioSignature(url, fd, token);
  assert.equal(await verifyTwilioSignature(url, fd, token, sig), true);
});
