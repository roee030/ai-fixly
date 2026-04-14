import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGooglePlacesType, getHebrewSearchQuery, getUrgencyConfig } from './professionConfig';

test('getGooglePlacesType: plumber returns "plumber"', () => {
  assert.equal(getGooglePlacesType('plumber'), 'plumber');
});

test('getGooglePlacesType: seamstress returns null', () => {
  assert.equal(getGooglePlacesType('seamstress'), null);
});

test('getGooglePlacesType: unknown returns null', () => {
  assert.equal(getGooglePlacesType('banana'), null);
});

test('getHebrewSearchQuery: plumber returns אינסטלטור', () => {
  assert.equal(getHebrewSearchQuery('plumber'), 'אינסטלטור');
});

test('getHebrewSearchQuery: metalworker returns מסגר', () => {
  assert.equal(getHebrewSearchQuery('metalworker'), 'מסגר');
});

test('getHebrewSearchQuery: unknown returns the input as-is', () => {
  assert.equal(getHebrewSearchQuery('banana'), 'banana');
});

test('getUrgencyConfig: urgent has wider radius and more providers', () => {
  const config = getUrgencyConfig('urgent');
  assert.equal(config.radiusMeters, 40000);
  assert.equal(config.maxProviders, 10);
  assert.ok(config.tonePrefix.length > 0);
});

test('getUrgencyConfig: normal has default radius', () => {
  const config = getUrgencyConfig('normal');
  assert.equal(config.radiusMeters, 20000);
  assert.equal(config.maxProviders, 5);
});

test('getUrgencyConfig: flexible has smaller radius', () => {
  const config = getUrgencyConfig('flexible');
  assert.equal(config.radiusMeters, 15000);
  assert.equal(config.maxProviders, 5);
});

test('getUrgencyConfig: unknown defaults to normal', () => {
  const config = getUrgencyConfig('banana');
  assert.equal(config.radiusMeters, 20000);
});
