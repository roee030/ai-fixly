import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortenProviderName } from './nameUtils';

test('regular two-word name passes through', () => {
  assert.equal(shortenProviderName('יוסי אברהמי'), 'יוסי אברהמי');
});

test('long pipe-separated name takes first 2 words', () => {
  assert.equal(shortenProviderName('קוסמי מחשבים | תיקון מחשבים | שירותי מחשוב'), 'קוסמי מחשבים');
});

test('strips בע"מ suffix', () => {
  assert.equal(shortenProviderName('א.ב שרברבות ואינסטלציה בע"מ'), 'א.ב שרברבות');
});

test('strips בע״מ suffix (Hebrew quotes)', () => {
  assert.equal(shortenProviderName('שיפוצי הצפון בע״מ'), 'שיפוצי הצפון');
});

test('strips LTD suffix', () => {
  assert.equal(shortenProviderName('ELITE PLUMBING SOLUTIONS LTD'), 'Elite Plumbing');
});

test('already short name passes through', () => {
  assert.equal(shortenProviderName('שרברב מקצועי'), 'שרברב מקצועי');
});

test('single word passes through', () => {
  assert.equal(shortenProviderName('יוסי'), 'יוסי');
});

test('empty string returns fallback', () => {
  assert.equal(shortenProviderName(''), 'בעל מקצוע');
});

test('truncates at 20 chars', () => {
  const result = shortenProviderName('Very Long Business Name Corporation International');
  assert.ok(result.length <= 21); // 20 + possible …
  assert.ok(result.endsWith('…') || result.length <= 20);
});

test('strips phone numbers from name', () => {
  assert.equal(shortenProviderName('יוסי שרברב 054-1234567'), 'יוסי שרברב');
});

test('strips dashes at end', () => {
  assert.equal(shortenProviderName('יוסי -'), 'יוסי');
});

test('null/undefined returns fallback', () => {
  assert.equal(shortenProviderName(null as any), 'בעל מקצוע');
  assert.equal(shortenProviderName(undefined as any), 'בעל מקצוע');
});
