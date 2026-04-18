#!/usr/bin/env tsx
/**
 * Scrape 20 real service-provider businesses per profession from Google
 * Places across 10 Israeli cities, write to a Hebrew-friendly CSV.
 *
 * Uses the Places API v1 (same endpoint the worker uses in production),
 * so billing + ToS are already sorted. One textSearch call per
 * (profession × city) combination, 5 in flight at a time.
 *
 * Output columns (UTF-8 with BOM so Excel opens Hebrew correctly):
 *   שם עסק, מקצוע, טלפון, עיר, דירוג בגוגל
 *
 * Usage:
 *   export GOOGLE_PLACES_API_KEY=...
 *   npx tsx scripts/scrape-providers.ts
 *
 * Run time: ~10-20 minutes for the full 80-profession × 10-city sweep.
 * Writes per-profession so a crash never loses completed work.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { PROFESSIONS } from '../src/constants/problemMatrix';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error(
    'ERROR: Set GOOGLE_PLACES_API_KEY in the environment.\n' +
      '  export GOOGLE_PLACES_API_KEY=your_key_here',
  );
  process.exit(1);
}

// Initial service-zone: Sharon coastal strip + Emek Hefer. This is the
// area the product is actually launching in — we don't want seed data
// from Tel Aviv / Be'er Sheva contaminating the "local pros near you"
// experience for our first users. Expand this array as we roll out.
// Strict corridor Netanya (south) → Caesarea (north). Anything north of
// Caesarea (Zichron/Binyamina) or south of Netanya (Herzliya/Ra'anana) is
// out-of-zone and will be post-filtered from formattedAddress even if the
// query happens to surface it.
const CITIES = [
  'נתניה',
  'אבן יהודה',
  'קדימה צורן',
  'תל מונד',
  'כפר יונה',
  'עמק חפר',
  'חדרה',
  'פרדס חנה כרכור',
  'אור עקיבא',
  'קיסריה',
];

// Post-filter whitelist. A result is kept only if its formattedAddress
// contains one of these tokens. Protects against Places returning a
// Tel Aviv locksmith for "מנעולן נתניה" because the relevance score spills.
const ALLOWED_CITY_TOKENS = [
  'נתניה',
  'אבן יהודה',
  'קדימה',
  'צורן',
  'תל מונד',
  'כפר יונה',
  'עמק חפר',
  'חדרה',
  'פרדס חנה',
  'כרכור',
  'אור עקיבא',
  'קיסריה',
  // Emek Hefer villages/moshavim that appear in addresses but not under
  // the regional council name. Expand this list if real providers get
  // excluded for legitimate in-zone villages.
  'בת חפר',
  'בחן',
  'גאולים',
  'בית יצחק',
  'שער חפר',
  'מכמורת',
  'בית חרות',
  'חבצלת השרון',
  'בית הלוי',
  'עולש',
  'חגלה',
  'גן יאשיה',
  'הדר עם',
  'אביחיל',
  'בית ינאי',
  'חופית',
  'מעברות',
  'עין החורש',
  'משמר השרון',
  'גבעת חיים',
  'הוגלה',
  'כפר ויתקין',
];

const CONCURRENCY = 5;
const MAX_PER_PROFESSION = 20;

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
// The same fieldmask the worker uses. Anything not listed here won't come
// back — keeps us under the lowest billing tier (Basic).
const FIELD_MASK = [
  'places.displayName',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
  'places.rating',
  'places.formattedAddress',
].join(',');

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface Provider {
  name: string;
  phone: string;
  city: string;
  rating: number | null;
}

interface PlacesResponse {
  places?: Array<{
    displayName?: { text?: string };
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
    rating?: number;
    formattedAddress?: string;
  }>;
  error?: { code?: number; message?: string; status?: string };
}

// ────────────────────────────────────────────────────────────────────────────
// Places call with 3 retries on 429/5xx
// ────────────────────────────────────────────────────────────────────────────

async function searchPlaces(query: string): Promise<PlacesResponse> {
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(PLACES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY!,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: 'he',
          regionCode: 'IL',
          pageSize: 20,
        }),
      });
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`transient ${response.status}`);
      }
      const json = (await response.json()) as PlacesResponse;
      return json;
    } catch (err: any) {
      lastErr = err;
      // Exponential-ish backoff: 1s, 2s, 4s.
      await sleep(1000 * attempt * attempt);
    }
  }
  throw lastErr || new Error('unknown places error');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ────────────────────────────────────────────────────────────────────────────
// City extractor — the formattedAddress is locale-dependent, but Israeli
// addresses follow "Street, City, Country" or "Street N, City". We grab the
// second-to-last non-empty segment, falling back to the full last segment.
// ────────────────────────────────────────────────────────────────────────────
function extractCity(address: string | undefined, fallback: string): string {
  if (!address) return fallback;
  // STRICTEST path: find one of our allowed corridor tokens inside the
  // address. If present, that is definitely the city — we already know the
  // business is in-zone. This avoids the "Street, Netanya" two-part bug
  // where slicing by position picks the street.
  for (const t of ALLOWED_CITY_TOKENS) {
    if (address.includes(t)) return t;
  }
  // Fallback for weird addresses that somehow passed the zone filter without
  // a known token — pick the last non-"Israel" segment, which in Israeli
  // formattedAddress is usually "Street, City" or "Street, City Zip, Israel".
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const withoutCountry = parts.filter(
    (p) => p !== 'ישראל' && p.toLowerCase() !== 'israel',
  );
  return withoutCountry[withoutCountry.length - 1] || fallback;
}

// ────────────────────────────────────────────────────────────────────────────
// Run search for a single (profession, city) and collect providers
// ────────────────────────────────────────────────────────────────────────────
async function fetchForCity(
  query: string,
  profession: string,
  city: string,
): Promise<Provider[]> {
  try {
    const json = await searchPlaces(`${query} ${city}`);
    if (json.error) {
      console.error(
        `[places] ERROR profession=${profession} city=${city} ` +
          `status=${json.error.status} message=${json.error.message}`,
      );
      return [];
    }
    const places = json.places || [];
    const rows: Provider[] = [];
    let rejectedOutOfZone = 0;
    for (const p of places) {
      const name = p.displayName?.text?.trim();
      const phone = p.internationalPhoneNumber || p.nationalPhoneNumber || '';
      if (!name || !phone) continue;
      // STRICT corridor filter — the whole reason for this rebuild. Reject
      // any business whose formattedAddress doesn't contain an allowed token.
      const address = p.formattedAddress || '';
      const inZone = ALLOWED_CITY_TOKENS.some((t) => address.includes(t));
      if (!inZone) {
        rejectedOutOfZone++;
        continue;
      }
      rows.push({
        name,
        phone,
        city: extractCity(p.formattedAddress, city),
        rating: typeof p.rating === 'number' ? p.rating : null,
      });
    }
    if (rejectedOutOfZone > 0) {
      console.error(
        `[places] profession=${profession} city=${city} filtered_out_of_zone=${rejectedOutOfZone}`,
      );
    }
    console.error(
      `[places] profession=${profession} city=${city} found=${rows.length}`,
    );
    return rows;
  } catch (err: any) {
    console.error(
      `[places] FAIL profession=${profession} city=${city} err=${err?.message || err}`,
    );
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Aggregate + dedupe across cities, keep top 20 by rating
// ────────────────────────────────────────────────────────────────────────────
async function collectForProfession(
  labelHe: string,
  searchQuery: string,
): Promise<Provider[]> {
  // Run the 10 city searches in batches of CONCURRENCY so we don't slam the
  // Places quota. `all` on batches is fine because we already retry inside.
  const results: Provider[] = [];
  for (let i = 0; i < CITIES.length; i += CONCURRENCY) {
    const batch = CITIES.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((city) => fetchForCity(searchQuery, labelHe, city)),
    );
    for (const arr of batchResults) results.push(...arr);
  }

  // Dedupe. Prefer phone as the stable key (unique per business); when
  // phone is empty — which we already filtered out above — we'd fall back
  // to name+city. Keeping the one with the highest rating when duplicates
  // appear across cities (e.g. tel-aviv + ramat-gan searches can find the
  // same chain).
  const byKey = new Map<string, Provider>();
  for (const row of results) {
    const key = row.phone || `${row.name}__${row.city}`;
    const existing = byKey.get(key);
    if (!existing || (row.rating ?? 0) > (existing.rating ?? 0)) {
      byKey.set(key, row);
    }
  }

  // Sort by rating desc, keep top 20.
  return Array.from(byKey.values())
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, MAX_PER_PROFESSION);
}

// ────────────────────────────────────────────────────────────────────────────
// CSV writer — append mode, UTF-8 with BOM
// ────────────────────────────────────────────────────────────────────────────
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if it contains a comma / newline / quote.
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function ensureCsvHeader(csvPath: string): Promise<void> {
  try {
    await fs.access(csvPath);
    // File exists — don't clobber.
    return;
  } catch {
    // doesn't exist yet.
  }
  const BOM = '\uFEFF';
  const header = 'שם עסק,מקצוע,טלפון,עיר,דירוג בגוגל\n';
  await fs.mkdir(path.dirname(csvPath), { recursive: true });
  await fs.writeFile(csvPath, BOM + header, 'utf8');
}

async function appendRows(
  csvPath: string,
  profession: string,
  providers: Provider[],
): Promise<void> {
  const lines = providers
    .map((p) =>
      [
        csvEscape(p.name),
        csvEscape(profession),
        csvEscape(p.phone),
        csvEscape(p.city),
        csvEscape(p.rating?.toFixed(1) ?? ''),
      ].join(','),
    )
    .join('\n');
  if (!lines) return;
  await fs.appendFile(csvPath, lines + '\n', 'utf8');
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const csvPath = path.resolve(
    __dirname,
    'providers-seed.csv',
  );
  await ensureCsvHeader(csvPath);
  console.error(`[scraper] writing to ${csvPath}`);
  console.error(`[scraper] ${PROFESSIONS.length} professions × ${CITIES.length} cities`);

  let totalRows = 0;
  const summary: Array<{ profession: string; count: number }> = [];

  for (const prof of PROFESSIONS) {
    const rows = await collectForProfession(prof.labelHe, prof.hebrewSearchQuery);
    await appendRows(csvPath, prof.labelHe, rows);
    totalRows += rows.length;
    summary.push({ profession: prof.labelHe, count: rows.length });
    console.error(
      `[scraper] ✓ ${prof.labelHe.padEnd(28)} rows=${rows.length} (total=${totalRows})`,
    );
  }

  console.error('\n[scraper] DONE');
  console.error(`[scraper] total rows: ${totalRows}`);
  console.error(`[scraper] CSV: ${csvPath}`);
  console.error('\n[scraper] Professions with < 10 rows (expand cities or accept the gap):');
  for (const { profession, count } of summary) {
    if (count < 10) {
      console.error(`  - ${profession.padEnd(28)} ${count} rows`);
    }
  }
}

main().catch((err) => {
  console.error('[scraper] FATAL', err);
  process.exit(1);
});
