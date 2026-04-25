import {
  fetchPublicRequestSummary,
  RequestNotFoundError,
  RequestClosedError,
  parseRequestToken,
} from './providerForm';

/**
 * The provider-form client must distinguish 404 ("we don't know this
 * request") from 410 ("we know it but it's closed") so the UI can show
 * different copy: a "report broken link" CTA vs an informational
 * "this request is closed" message.
 */
describe('fetchPublicRequestSummary', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('returns the body on 200', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            requestId: 'abc',
            city: 'חדרה',
            textDescription: 'leak',
            mediaUrls: [],
          }),
      } as any),
    );
    const summary = await fetchPublicRequestSummary('abc');
    expect(summary.requestId).toBe('abc');
    expect(summary.city).toBe('חדרה');
  });

  test('throws RequestNotFoundError on 404 — UI shows "report broken link"', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 404 } as any),
    );
    await expect(fetchPublicRequestSummary('missing-id')).rejects.toBeInstanceOf(
      RequestNotFoundError,
    );
  });

  test('throws RequestClosedError on 410 — UI shows informational closed state', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 410 } as any),
    );
    await expect(fetchPublicRequestSummary('closed-id')).rejects.toBeInstanceOf(
      RequestClosedError,
    );
  });

  test('throws a generic Error on 500 (network/server failure)', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 } as any),
    );
    const err = await fetchPublicRequestSummary('id').catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(RequestNotFoundError);
    expect(err).not.toBeInstanceOf(RequestClosedError);
  });

  test('error classes are distinct so `instanceof` discrimination works', () => {
    const notFound = new RequestNotFoundError();
    const closed = new RequestClosedError();
    expect(notFound).toBeInstanceOf(RequestNotFoundError);
    expect(notFound).not.toBeInstanceOf(RequestClosedError);
    expect(closed).toBeInstanceOf(RequestClosedError);
    expect(closed).not.toBeInstanceOf(RequestNotFoundError);
  });
});

/**
 * Twilio interactive templates allow only one variable per CTA URL, so
 * the broker packs `requestId` and `providerPhone` into a single
 * `<id>.<phoneDigits>` token. parseRequestToken splits them back.
 *
 * The legacy text-only flow uses a plain id with a `?phone=` query
 * param — we still need to support that for in-flight messages.
 */
describe('parseRequestToken', () => {
  test('legacy: bare id + phone query param', () => {
    expect(parseRequestToken('abc123', '+972501234567')).toEqual({
      requestId: 'abc123',
      providerPhone: '+972501234567',
    });
  });

  test('compound: id.phoneDigits restores the leading +', () => {
    expect(parseRequestToken('abc123.972501234567', '')).toEqual({
      requestId: 'abc123',
      providerPhone: '+972501234567',
    });
  });

  test('compound token wins over query phone (template path is the source of truth)', () => {
    expect(parseRequestToken('abc.972501234567', '+972999999999')).toEqual({
      requestId: 'abc',
      providerPhone: '+972501234567',
    });
  });

  test('compound token where phone already starts with + (defensive)', () => {
    // Should not double-prefix the +.
    expect(parseRequestToken('abc.+972501234567', '')).toEqual({
      requestId: 'abc',
      providerPhone: '+972501234567',
    });
  });

  test('whitespace around the raw id is trimmed', () => {
    expect(parseRequestToken('  abc.972501234567  ', '')).toEqual({
      requestId: 'abc',
      providerPhone: '+972501234567',
    });
  });

  test('empty token + empty phone → empty result (callers must show error UI)', () => {
    expect(parseRequestToken('', '')).toEqual({
      requestId: '',
      providerPhone: '',
    });
  });

  test('compound with empty phone segment falls back to the query phone', () => {
    expect(parseRequestToken('abc.', '+972888888888')).toEqual({
      requestId: 'abc',
      providerPhone: '+972888888888',
    });
  });

  test('compound with multiple dots (defensive: rejoins the rest as phone)', () => {
    // Should not silently drop digits. Best-effort: take everything after
    // the first dot as the phone.
    const result = parseRequestToken('abc.972.501234567', '');
    expect(result.requestId).toBe('abc');
    // The rejoin includes the second dot — caller can sanitise further.
    expect(result.providerPhone).toContain('972');
    expect(result.providerPhone).toContain('501234567');
  });
});
