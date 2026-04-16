/**
 * Tiny in-memory store for the "where did the user actually want to go?"
 * problem.
 *
 * When AuthGate forces an unauthenticated visitor through phone auth, the
 * original deep link they tapped is otherwise lost — they end up at /(tabs)
 * instead of /request/abc-123 or wherever. This store remembers that target
 * across the auth flow.
 *
 * Lifecycle:
 *   capture(path) — called from AuthGate the moment we redirect to /(auth)/phone.
 *   consume()      — called once after auth completes; returns the path and
 *                    clears it. Subsequent calls return null.
 *
 * Module-level state is fine here because:
 *   • Auth is single-flight per session (no concurrent capture races).
 *   • Reload of the app naturally clears the state, which is the right thing
 *     — if the user closed the app, "where they wanted to go" is stale.
 *
 * We deliberately avoid persisting this to disk: stale intents from a
 * week-ago tap would be more confusing than helpful.
 */

let pendingTarget: string | null = null;

// Paths we never want to "return to" after auth: the auth screens themselves,
// the onboarding screens, and "fully internal" routes that don't make sense
// as a landing destination.
const NEVER_RESTORE_PREFIXES = ['/(auth)', '/onboarding', '/_'];

export const intentStore = {
  capture(path: string): void {
    if (!path) return;
    if (NEVER_RESTORE_PREFIXES.some((p) => path.startsWith(p))) return;
    if (path === '/' || path === '/(tabs)') return;
    pendingTarget = path;
  },
  consume(): string | null {
    const target = pendingTarget;
    pendingTarget = null;
    return target;
  },
  peek(): string | null {
    return pendingTarget;
  },
};
