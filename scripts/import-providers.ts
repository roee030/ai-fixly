#!/usr/bin/env tsx
/**
 * Bulk-import providers from a CSV file. Each row promotes one Firebase
 * Auth user to a registered provider by calling the broker's
 * /admin/register-provider endpoint.
 *
 * Required env:
 *   BROKER_URL          — e.g. https://broker.your-domain.workers.dev
 *   BROKER_ADMIN_TOKEN  — value of the worker's ADMIN_TOKEN secret
 *
 * Usage:
 *   npx tsx scripts/import-providers.ts path/to/providers.csv
 *
 * CSV format (UTF-8, header row required, comma-separated):
 *
 *   uid,phone,profession,lat,lng,radiusKm
 *   AbC123,+972501234567,plumber,32.31,34.85,20
 *   DeF456,+972527654321,electrician,32.43,34.92,15
 *
 * Notes:
 *   - `uid` must already exist in Firebase Auth (user signed up via app).
 *   - `profession` is one of the keys from `src/constants/problemMatrix.ts`
 *     (plumber, electrician, hvac_contractor, ...). Use `add-provider.ts
 *     --help` or read PROFESSIONS to see all 77.
 *   - `radiusKm` is optional; defaults to 20.
 *   - Lines starting with `#` are skipped.
 *
 * Failures don't abort the run — each row's outcome is reported, and
 * the script exits with code 1 if ANY row failed (so CI can fail loudly).
 */

import { promises as fs } from 'fs';
import { PROFESSIONS } from '../src/constants/problemMatrix';

const BROKER_URL = process.env.BROKER_URL || '';
const ADMIN_TOKEN = process.env.BROKER_ADMIN_TOKEN || '';

if (!BROKER_URL || !ADMIN_TOKEN) {
  console.error('ERROR: set BROKER_URL and BROKER_ADMIN_TOKEN in the environment');
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('ERROR: pass the CSV file path as the first argument');
  console.error('Example: npx tsx scripts/import-providers.ts providers.csv');
  process.exit(1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

async function main() {
  const raw = await fs.readFile(csvPath, 'utf8');
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    console.error('No data rows found.');
    process.exit(1);
  }

  let okCount = 0;
  let failCount = 0;
  for (const [i, row] of rows.entries()) {
    const lineNo = i + 2; // +1 for header, +1 for 1-indexing
    const validation = validateRow(row);
    if (!validation.ok) {
      console.error(`✗ line ${lineNo}: ${validation.error}`);
      failCount++;
      continue;
    }
    const profDef = PROFESSIONS.find((p) => p.key === validation.row.profession)!;
    const payload = {
      uid: validation.row.uid,
      phone: validation.row.phone,
      profession: validation.row.profession,
      professionLabelHe: profDef.labelHe,
      location: { lat: validation.row.lat, lng: validation.row.lng },
      serviceRadiusKm: validation.row.radiusKm,
    };
    try {
      const res = await fetch(`${BROKER_URL}/admin/register-provider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': ADMIN_TOKEN,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`✗ line ${lineNo} (${payload.phone}): HTTP ${res.status} — ${text.slice(0, 120)}`);
        failCount++;
      } else {
        console.log(`✓ line ${lineNo}: ${payload.phone} → ${profDef.labelHe}`);
        okCount++;
      }
    } catch (err: any) {
      console.error(`✗ line ${lineNo} (${payload.phone}): ${err?.message || err}`);
      failCount++;
    }
  }

  console.log('');
  console.log(`Done. ${okCount} ok, ${failCount} failed.`);
  if (failCount > 0) process.exit(1);
}

interface ValidatedRow {
  uid: string;
  phone: string;
  profession: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

function validateRow(row: Record<string, string>):
  | { ok: true; row: ValidatedRow }
  | { ok: false; error: string } {
  for (const k of ['uid', 'phone', 'profession', 'lat', 'lng']) {
    if (!row[k] || row[k].trim() === '') {
      return { ok: false, error: `missing required column "${k}"` };
    }
  }
  const profession = row.profession.trim();
  if (!PROFESSIONS.find((p) => p.key === profession)) {
    return { ok: false, error: `unknown profession "${profession}"` };
  }
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (isNaN(lat) || isNaN(lng)) {
    return { ok: false, error: `lat/lng not numeric` };
  }
  const radiusKm = row.radiusKm ? Number(row.radiusKm) : 20;
  if (isNaN(radiusKm) || radiusKm <= 0) {
    return { ok: false, error: `bad radiusKm` };
  }
  return {
    ok: true,
    row: {
      uid: row.uid.trim(),
      phone: row.phone.trim(),
      profession,
      lat,
      lng,
      radiusKm,
    },
  };
}

/**
 * Tiny CSV parser sufficient for our admin file (no quoted commas,
 * UTF-8 BOM stripped, # for comments).
 */
function parseCsv(raw: string): Array<Record<string, string>> {
  const stripped = raw.replace(/^\uFEFF/, '');
  const lines = stripped.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const out: Record<string, string> = {};
    headers.forEach((h, i) => (out[h] = cells[i] || ''));
    return out;
  });
}
