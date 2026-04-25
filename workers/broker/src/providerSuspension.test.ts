import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideAutoSuspension, PROVIDER_SUSPENSION_CONFIG } from './providerSuspension';

const { BUFFER_SIZE, MIN_AVG_RATING, MIN_SAMPLES_FOR_DECISION } = PROVIDER_SUSPENSION_CONFIG;

// =============================================================================
// Buffer mechanics — sliding window of last N ratings
// =============================================================================

test('appends the new rating to the rolling buffer', () => {
  const r = decideAutoSuspension([5, 5], 4, false);
  assert.deepEqual(r.recentRatings, [5, 5, 4]);
});

test('drops the oldest rating once the buffer is full', () => {
  const r = decideAutoSuspension([5, 5, 5, 5, 5], 4, false);
  assert.equal(r.recentRatings.length, BUFFER_SIZE);
  // Oldest entry was dropped, newest appended at the end.
  assert.deepEqual(r.recentRatings, [5, 5, 5, 5, 4]);
});

test('handles the empty-history first-review case', () => {
  const r = decideAutoSuspension([], 5, false);
  assert.deepEqual(r.recentRatings, [5]);
  assert.equal(r.shouldSuspend, false); // not enough samples
});

// =============================================================================
// Suspension threshold — avg of last N must be below 3.0
// =============================================================================

test('does NOT suspend a brand-new provider on a single bad review', () => {
  // Need MIN_SAMPLES_FOR_DECISION before we make a call.
  const r = decideAutoSuspension([], 1, false);
  assert.equal(r.shouldSuspend, false);
});

test('does NOT suspend after 2 reviews even if both are bad (still under threshold)', () => {
  // 2 samples is below MIN_SAMPLES_FOR_DECISION (3).
  assert.equal(MIN_SAMPLES_FOR_DECISION, 3);
  const r = decideAutoSuspension([1], 1, false);
  assert.equal(r.recentRatings.length, 2);
  assert.equal(r.shouldSuspend, false);
});

test('suspends a consistently-poor provider once we have 3+ samples', () => {
  const r = decideAutoSuspension([2, 2], 2, false);
  assert.equal(r.recentRatings.length, 3);
  assert.equal(r.shouldSuspend, true);
  assert.equal(r.avgInBuffer, 2);
  assert.ok(r.reason);
  assert.match(r.reason as string, /2\.0⭐/);
});

test('does NOT suspend on a single 1⭐ in an otherwise stellar run', () => {
  // [5,5,5,5,1] → avg 4.2 — provider gets a pass on a single bad day.
  const r = decideAutoSuspension([5, 5, 5, 5], 1, false);
  assert.equal(r.shouldSuspend, false);
  assert.equal(r.avgInBuffer, 4.2);
});

test('catches a late-stage slide: [5,2,3,2,1] → 2.6', () => {
  const r = decideAutoSuspension([5, 2, 3, 2], 1, false);
  assert.equal(r.shouldSuspend, true);
  assert.equal(r.avgInBuffer, 2.6);
});

test('catches consistent mediocrity: [3,2,3,2,1] → 2.2', () => {
  const r = decideAutoSuspension([3, 2, 3, 2], 1, false);
  assert.equal(r.shouldSuspend, true);
  assert.equal(r.avgInBuffer, 2.2);
});

test('does NOT suspend a borderline provider whose buffer averages exactly 3.0', () => {
  // Edge: avg 3.0 is "OK" — strict less-than check.
  const r = decideAutoSuspension([3, 3, 3, 3], 3, false);
  assert.equal(r.avgInBuffer, 3);
  assert.equal(r.shouldSuspend, false);
});

test('does suspend when avg is just under threshold (2.99...)', () => {
  // 4×3 + 2 = 14 / 5 = 2.8 — should suspend.
  const r = decideAutoSuspension([3, 3, 3, 3], 2, false);
  assert.equal(r.avgInBuffer, 2.8);
  assert.equal(r.shouldSuspend, true);
});

// =============================================================================
// Admin override — alreadySuspended provider stays suspended
// =============================================================================

test('keeps an already-suspended provider suspended even if buffer would clear them', () => {
  // Even with a perfect 5×5⭐ buffer, an already-suspended provider stays
  // suspended — admin un-suspension has to be explicit so a single great
  // review can't auto-clear someone the team disabled on purpose.
  const r = decideAutoSuspension([5, 5, 5, 5], 5, true);
  assert.equal(r.shouldSuspend, true);
});

test('avgInBuffer is reported regardless of suspension state (admin UI uses it)', () => {
  const r = decideAutoSuspension([3, 4], 5, false);
  assert.equal(r.avgInBuffer, 4);
  assert.equal(r.shouldSuspend, false);
});

// =============================================================================
// Reason string — surfaced in the admin alert
// =============================================================================

test('reason string is set only when suspending', () => {
  const okay = decideAutoSuspension([5, 5], 5, false);
  assert.equal(okay.reason, undefined);

  const bad = decideAutoSuspension([1, 1], 1, false);
  assert.ok(bad.reason);
});

test('reason includes the actual ratings so admin can audit the decision', () => {
  const r = decideAutoSuspension([2, 1, 2], 2, false);
  // Should mention each rating + the count.
  assert.ok(r.reason!.includes('2,1,2,2') || r.reason!.includes('2,1,2'));
  assert.ok(r.reason!.includes('⭐'));
});

// =============================================================================
// Config sanity — the constants are sane (avoid silent regressions)
// =============================================================================

test('config: buffer size is 5', () => {
  assert.equal(BUFFER_SIZE, 5);
});

test('config: min samples is 3', () => {
  assert.equal(MIN_SAMPLES_FOR_DECISION, 3);
});

test('config: min avg rating is 3.0', () => {
  assert.equal(MIN_AVG_RATING, 3.0);
});
