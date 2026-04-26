/**
 * Empty stub for native-only modules that have no web equivalent
 * (Sentry RN, FCM, etc). Storybook stories don't exercise these; the
 * stub just keeps the import graph from blowing up when a UI primitive
 * indirectly pulls one of them in via a service module.
 */
const noop = () => {};
const proxy = new Proxy(
  {},
  {
    get: () => proxy,
    apply: () => proxy,
  },
) as any;

export default proxy;
export const init = noop;
export const captureException = noop;
export const captureMessage = noop;
export const setUser = noop;
export const addBreadcrumb = noop;
export const wrap = (c: unknown) => c;
export const withScope = (cb: (scope: unknown) => void) => cb(proxy);
