import { PROFESSIONS } from '../../constants/problemMatrix';

// Typed as Set<string> on purpose: the input we validate is unknown user
// data, so .has(arbitraryString) must compile. Without the cast, the Set
// inherits ProfessionKey and refuses string inputs.
const VALID_PROFESSION_KEYS: Set<string> = new Set(PROFESSIONS.map((p) => p.key));

/** Hard cap so a runaway model can't return 50 professions. */
const MAX_PROFESSIONS = 3;

/**
 * Sanitise the `professions` array Gemini returns into a list our app
 * actually understands.
 *
 * The model occasionally returns:
 *   - keys we've never heard of ("drywaller", "garbage_man") — we reported
 *     'handyman drywaller' showing untranslated in the UI;
 *   - duplicates (same key listed three times for emphasis);
 *   - non-string entries (null / numbers / objects);
 *   - empty arrays;
 *   - the wrong shape entirely (string instead of array).
 *
 * In every case we want a non-empty list of valid keys, capped at
 * MAX_PROFESSIONS. Unknown values fall back to `'handyman'` so the user
 * still gets *some* match instead of an empty broadcast.
 */
export function validateProfessionKeys(raw: unknown): string[] {
  // Treat anything that isn't a non-empty array as "no professions".
  // Bypass the empty-array path explicitly so [] still maps to ['handyman'].
  const list = Array.isArray(raw) && raw.length > 0 ? raw : ['handyman'];

  const sanitised = list.map((p) =>
    typeof p === 'string' && VALID_PROFESSION_KEYS.has(p) ? p : 'handyman',
  );

  // Dedupe while preserving order — ['plumber','plumber','handyman'] becomes
  // ['plumber','handyman'], not ['plumber','handyman','plumber'].
  const deduped = Array.from(new Set(sanitised));

  // Hard cap. The model is asked for ≤3 in the prompt, but trust nothing.
  return deduped.slice(0, MAX_PROFESSIONS);
}

export { VALID_PROFESSION_KEYS };
