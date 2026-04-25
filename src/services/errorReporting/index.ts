import { Platform } from 'react-native';

/**
 * Thin wrapper over Sentry so the rest of the app doesn't have to:
 *   - import @sentry/react-native (which doesn't load on web)
 *   - check `__DEV__` everywhere
 *   - handle missing DSN gracefully
 *
 * Every catch site that previously did `catch {}` or `catch (err) { console.warn(...) }`
 * should call `captureException(err, { tags, extra })` so production failures
 * actually show up in Sentry instead of being silently lost.
 *
 * Tags are low-cardinality discriminators (e.g. `screen: 'phone_auth'`).
 * Extra is unstructured context (full payload, request ID, user state).
 */

interface ErrorContext {
  /** Low-cardinality discriminator for filtering in Sentry. */
  tags?: Record<string, string>;
  /** Unstructured context — can be any JSON-serialisable shape. */
  extra?: Record<string, unknown>;
  /** Override the default 'error' severity. */
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

let sentryModule: any = null;
let isInitialised = false;

// Lazy-load @sentry/react-native only on native platforms. The web SDK is
// initialised separately in app/_layout.tsx, so we don't need to import it
// here at all.
function getSentry(): any | null {
  if (Platform.OS === 'web') return null;
  if (sentryModule) return sentryModule;
  try {
    sentryModule = require('@sentry/react-native');
    return sentryModule;
  } catch {
    return null;
  }
}

/** Mark Sentry as ready. Call from `_layout.tsx` after `Sentry.init()`. */
export function markErrorReportingReady(): void {
  isInitialised = true;
}

/**
 * Report an error to Sentry. Safe to call even if Sentry isn't configured —
 * it falls back to `console.error` in dev so the failure is still visible.
 *
 * @param err   The thrown value. Anything — Errors, strings, objects.
 * @param ctx   Optional discriminators + payload.
 */
export function captureException(err: unknown, ctx: ErrorContext = {}): void {
  // Always log in dev — Sentry might be disabled, and we want the stack
  // trace in the Metro console either way.
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[capture]', ctx.tags, err);
  }

  const sentry = getSentry();
  if (!sentry || !isInitialised) return;

  try {
    sentry.withScope((scope: any) => {
      if (ctx.level) scope.setLevel(ctx.level);
      if (ctx.tags) {
        for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
      }
      if (ctx.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
      }
      sentry.captureException(err);
    });
  } catch {
    // Reporting must never throw — that would amplify whatever bug we
    // were trying to report into a hard crash.
  }
}

/**
 * Report a non-error event ("user did X, here's the state we want to see").
 * Useful for "this shouldn't happen but didn't crash" branches.
 */
export function captureMessage(
  message: string,
  ctx: ErrorContext = {},
): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[capture-msg]', ctx.tags, message);
  }

  const sentry = getSentry();
  if (!sentry || !isInitialised) return;

  try {
    sentry.withScope((scope: any) => {
      scope.setLevel(ctx.level || 'warning');
      if (ctx.tags) {
        for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
      }
      if (ctx.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
      }
      sentry.captureMessage(message);
    });
  } catch {
    // see captureException
  }
}

/**
 * Set the current user on the Sentry scope so error reports get a
 * `user.id` we can correlate. Pass `null` on sign-out to clear it.
 */
export function setErrorReportingUser(uid: string | null): void {
  const sentry = getSentry();
  if (!sentry || !isInitialised) return;
  try {
    sentry.setUser(uid ? { id: uid } : null);
  } catch {
    // see captureException
  }
}

/**
 * Add a breadcrumb — small log event included with the next captured
 * error. Useful for "what was the user doing right before this crashed".
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
): void {
  const sentry = getSentry();
  if (!sentry || !isInitialised) return;
  try {
    sentry.addBreadcrumb({
      message,
      level: 'info',
      data,
      timestamp: Date.now() / 1000,
    });
  } catch {
    // see captureException
  }
}
