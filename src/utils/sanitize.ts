/**
 * Input sanitization utilities. Use on all user-provided text before
 * storing in Firestore or sending to external services.
 *
 * Defense against:
 * - XSS: strip HTML tags
 * - Script injection: remove <script> and event handlers
 * - SQL injection: not applicable (Firestore is NoSQL) but strip anyway
 * - Oversized input: enforce max lengths
 */

/**
 * Strip HTML tags and script content from a string.
 * Safe for display in React Native (which doesn't render HTML).
 */
export function sanitizeText(input: string, maxLength: number = 2000): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')  // Remove script blocks
    .replace(/<[^>]*>/g, '')                       // Remove HTML tags
    .replace(/javascript:/gi, '')                  // Remove JS URLs
    .replace(/on\w+\s*=/gi, '')                   // Remove event handlers
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a phone number — keep only digits, +, and -
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[^\d+\-\s()]/g, '').trim().slice(0, 20);
}

/**
 * Sanitize an email address — basic validation + lowercase
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const cleaned = input.trim().toLowerCase().slice(0, 254);
  // Basic email pattern check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return '';
  return cleaned;
}

/**
 * Sanitize a numeric string — keep only digits
 */
export function sanitizeNumeric(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[^\d]/g, '').slice(0, 10);
}
