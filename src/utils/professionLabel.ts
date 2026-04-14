import { PROFESSIONS } from '../constants/problemMatrix';
import type { ProfessionKey } from '../constants/problemMatrix';

type TFunction = (key: string, opts?: Record<string, any>) => string;

/**
 * Localize a profession, regardless of whether the caller has the key
 * (e.g. 'plumber') or the Hebrew label from the AI response
 * (e.g. 'אינסטלטור'). AI returns both — `professions: [keys]` and
 * `professionLabelsHe: [labels]` — but older data may have labels only.
 *
 * Lookup order:
 *  1. If `input` matches a key in PROFESSIONS → t(`professions.<key>`)
 *  2. If `input` matches a Hebrew label → t of that profession's key
 *  3. Fallback: return `input` unchanged (preserves unknown custom labels)
 */
export function localizeProfession(input: string, t: TFunction): string {
  if (!input) return input;

  // Direct key match (e.g., 'plumber')
  const byKey = PROFESSIONS.find((p) => p.key === input);
  if (byKey) return t(`professions.${byKey.key}`);

  // Hebrew-label match (e.g., 'אינסטלטור')
  const byLabel = PROFESSIONS.find((p) => p.labelHe === input);
  if (byLabel) return t(`professions.${byLabel.key}`);

  return input;
}

/**
 * Convenience: given the full AI analysis arrays, returns the localized
 * label for position `index` (default 0 — primary profession).
 * Prefers the key array (stable) over the Hebrew-label array.
 */
export function primaryProfessionLabel(
  aiAnalysis: { professions?: string[]; professionLabelsHe?: string[] } | null | undefined,
  t: TFunction,
  index = 0,
): string | null {
  if (!aiAnalysis) return null;
  const key = aiAnalysis.professions?.[index];
  if (key) return localizeProfession(key, t);
  const label = aiAnalysis.professionLabelsHe?.[index];
  if (label) return localizeProfession(label, t);
  return null;
}
