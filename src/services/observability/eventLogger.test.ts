const mockAddDoc = jest.fn();
const mockCollection = jest.fn((..._args: unknown[]) => ({ __col: true }));
const mockGetFirestore = jest.fn(() => ({ __db: true }));

jest.mock('../firestore/imports', () => ({
  getFirestore: (...args: unknown[]) => mockGetFirestore(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: () => 'SERVER_TIMESTAMP_SENTINEL',
}));

import { eventLogger } from './eventLogger';

describe('eventLogger', () => {
  beforeEach(() => {
    mockAddDoc.mockReset();
    mockCollection.mockReset();
    mockCollection.mockReturnValue({ __col: true });
  });

  it('writes an event under serviceRequests/{id}/events', async () => {
    mockAddDoc.mockResolvedValue({ id: 'ev1' });

    await eventLogger.log('req-1', {
      type: 'gemini',
      ok: true,
      durationMs: 1234,
      metadata: { model: 'flash' },
    });

    expect(mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'serviceRequests',
      'req-1',
      'events',
    );
    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'gemini',
        ok: true,
        durationMs: 1234,
        metadata: { model: 'flash' },
        startedAt: 'SERVER_TIMESTAMP_SENTINEL',
      }),
    );
  });

  it('swallows errors — never throws', async () => {
    mockAddDoc.mockRejectedValue(new Error('firestore down'));
    await expect(
      eventLogger.log('req-1', { type: 'gemini', ok: true, durationMs: 1 }),
    ).resolves.toBeUndefined();
  });

  it('no-ops when requestId is empty', async () => {
    await eventLogger.log('', { type: 'gemini', ok: true, durationMs: 1 });
    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});
