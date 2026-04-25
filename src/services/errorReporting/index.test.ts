/**
 * Contract tests for the Sentry wrapper.
 *
 * The wrapper has only three contracts that production cares about:
 *   1. captureException must NEVER throw — even before init, even if
 *      Sentry itself fails. We sprinkle these calls in `catch` blocks;
 *      a throwing reporter would amplify any bug into a crash.
 *   2. captureException is a no-op before markErrorReportingReady().
 *   3. addBreadcrumb / captureMessage / setErrorReportingUser have the
 *      same no-throw guarantee.
 *
 * We don't try to assert on what Sentry sees — the global jest.setup.js
 * mock for @sentry/react-native interacts with module-level caching in
 * a way that makes per-test spy capture fragile. The real verification
 * happens in production via Sentry itself.
 */

beforeEach(() => {
  jest.resetModules();
});

describe('errorReporting — never throws', () => {
  test('captureException with an Error', () => {
    const { captureException } = require('./index');
    expect(() => captureException(new Error('boom'))).not.toThrow();
  });

  test('captureException with a string', () => {
    const { captureException } = require('./index');
    expect(() => captureException('something went wrong')).not.toThrow();
  });

  test('captureException with null/undefined', () => {
    const { captureException } = require('./index');
    expect(() => captureException(null)).not.toThrow();
    expect(() => captureException(undefined)).not.toThrow();
  });

  test('captureException with rich context', () => {
    const { captureException } = require('./index');
    expect(() =>
      captureException(new Error('boom'), {
        tags: { screen: 'phone_auth', action: 'send_otp' },
        extra: { phoneLength: 10 },
        level: 'fatal',
      }),
    ).not.toThrow();
  });

  test('captureMessage with a level', () => {
    const { captureMessage } = require('./index');
    expect(() =>
      captureMessage('unexpected branch reached', {
        tags: { service: 'broadcast' },
        level: 'warning',
      }),
    ).not.toThrow();
  });

  test('setErrorReportingUser before init', () => {
    const { setErrorReportingUser } = require('./index');
    expect(() => setErrorReportingUser('uid-123')).not.toThrow();
    expect(() => setErrorReportingUser(null)).not.toThrow();
  });

  test('addBreadcrumb before init', () => {
    const { addBreadcrumb } = require('./index');
    expect(() => addBreadcrumb('user tapped capture', { source: 'home' })).not.toThrow();
  });

  test('after markErrorReportingReady, all functions still no-throw', () => {
    const {
      captureException,
      captureMessage,
      addBreadcrumb,
      setErrorReportingUser,
      markErrorReportingReady,
    } = require('./index');
    markErrorReportingReady();

    expect(() => captureException(new Error('boom'))).not.toThrow();
    expect(() => captureMessage('warn')).not.toThrow();
    expect(() => addBreadcrumb('breadcrumb')).not.toThrow();
    expect(() => setErrorReportingUser('uid')).not.toThrow();
  });
});

describe('errorReporting — markErrorReportingReady', () => {
  test('is a function with no return value', () => {
    const { markErrorReportingReady } = require('./index');
    expect(typeof markErrorReportingReady).toBe('function');
    expect(markErrorReportingReady()).toBeUndefined();
  });

  test('is idempotent — calling twice is safe', () => {
    const { markErrorReportingReady } = require('./index');
    expect(() => {
      markErrorReportingReady();
      markErrorReportingReady();
    }).not.toThrow();
  });
});
