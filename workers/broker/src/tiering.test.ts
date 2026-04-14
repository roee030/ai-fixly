import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getProvidersForWave, shouldSendNextWave, WAVE_CONFIG } from './tiering';

// Mock providers sorted by rating (descending)
const mockProviders = [
  { name: 'A', rating: 4.9 },
  { name: 'B', rating: 4.7 },
  { name: 'C', rating: 4.5 },
  { name: 'D', rating: 4.2 },
  { name: 'E', rating: 3.8 },
  { name: 'F', rating: 3.5 },
  { name: 'G', rating: 3.0 },
];

// Wave 1: first 3 providers
test('wave 1 returns first 3 providers', () => {
  const result = getProvidersForWave(mockProviders, 1);
  assert.equal(result.length, 3);
  assert.equal(result[0].name, 'A');
  assert.equal(result[2].name, 'C');
});

// Wave 2: next 3 providers
test('wave 2 returns providers 4-6', () => {
  const result = getProvidersForWave(mockProviders, 2);
  assert.equal(result.length, 3);
  assert.equal(result[0].name, 'D');
  assert.equal(result[2].name, 'F');
});

// Wave 3: all remaining
test('wave 3 returns all remaining providers', () => {
  const result = getProvidersForWave(mockProviders, 3);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'G');
});

// Edge: fewer providers than wave size
test('wave 1 with only 2 providers returns 2', () => {
  const result = getProvidersForWave(mockProviders.slice(0, 2), 1);
  assert.equal(result.length, 2);
});

// Edge: wave 2 with exactly 3 providers total (wave 2 is empty)
test('wave 2 returns empty if only 3 providers total', () => {
  const result = getProvidersForWave(mockProviders.slice(0, 3), 2);
  assert.equal(result.length, 0);
});

// Edge: empty provider list
test('wave 1 with no providers returns empty', () => {
  const result = getProvidersForWave([], 1);
  assert.equal(result.length, 0);
});

// shouldSendNextWave logic
test('should send wave 2 when 0 bids received', () => {
  assert.equal(shouldSendNextWave(0), true);
});

test('should send wave 2 when 1 bid received', () => {
  assert.equal(shouldSendNextWave(1), true);
});

test('should NOT send next wave when 2 bids received', () => {
  assert.equal(shouldSendNextWave(2), false);
});

test('should NOT send next wave when 5 bids received', () => {
  assert.equal(shouldSendNextWave(5), false);
});

// Config exported correctly
test('WAVE_CONFIG has correct delays', () => {
  assert.equal(WAVE_CONFIG.WAVE_SIZE, 3);
  assert.equal(WAVE_CONFIG.MIN_BIDS_TO_STOP, 2);
  assert.equal(WAVE_CONFIG.WAVE_2_DELAY_MINUTES, 15);
  assert.equal(WAVE_CONFIG.WAVE_3_DELAY_MINUTES, 30);
});
