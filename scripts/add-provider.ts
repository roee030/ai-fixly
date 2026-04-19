#!/usr/bin/env tsx
/**
 * Promote a single Firebase Auth user to a registered provider.
 *
 * Required env:
 *   BROKER_URL          — e.g. https://broker.your-domain.workers.dev
 *   BROKER_ADMIN_TOKEN  — value of the worker's ADMIN_TOKEN secret
 *
 * Usage:
 *   npx tsx scripts/add-provider.ts \
 *     --uid=AbC123 \
 *     --phone=+972501234567 \
 *     --profession=plumber \
 *     --lat=32.31 --lng=34.85 \
 *     [--radius=20]
 *
 * The user must already exist in Firebase Auth (have signed up via the
 * app at least once). UID can be copied from the Firebase Console →
 * Authentication → Users tab.
 *
 * For bulk imports of many providers, see `import-providers.ts`.
 */

import { PROFESSIONS } from '../src/constants/problemMatrix';

const BROKER_URL = process.env.BROKER_URL || '';
const ADMIN_TOKEN = process.env.BROKER_ADMIN_TOKEN || '';

if (!BROKER_URL || !ADMIN_TOKEN) {
  console.error('ERROR: set BROKER_URL and BROKER_ADMIN_TOKEN in the environment');
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const required = ['uid', 'phone', 'profession', 'lat', 'lng'] as const;
for (const k of required) {
  if (!args[k]) {
    console.error(`ERROR: missing --${k}`);
    process.exit(1);
  }
}

const profession = String(args.profession);
const profDef = PROFESSIONS.find((p) => p.key === profession);
if (!profDef) {
  console.error(
    `ERROR: unknown profession "${profession}". Valid keys: ${PROFESSIONS.map((p) => p.key).join(', ')}`,
  );
  process.exit(1);
}

const payload = {
  uid: String(args.uid),
  phone: String(args.phone),
  profession,
  professionLabelHe: profDef.labelHe,
  location: { lat: Number(args.lat), lng: Number(args.lng) },
  serviceRadiusKm: args.radius ? Number(args.radius) : 20,
};

main();

async function main() {
  const res = await fetch(`${BROKER_URL}/admin/register-provider`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`✗ HTTP ${res.status}: ${text}`);
    process.exit(1);
  }
  console.log(`✓ provider registered: ${payload.phone} as ${payload.professionLabelHe}`);
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of argv) {
    if (!a.startsWith('--')) continue;
    const [k, v] = a.slice(2).split('=');
    out[k] = v ?? 'true';
  }
  return out;
}
