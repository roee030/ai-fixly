import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAdminQuery, __clearAdminQueryCache } from './useAdminQuery';

describe('useAdminQuery', () => {
  beforeEach(() => __clearAdminQueryCache());

  it('calls the fn and returns data', async () => {
    const fn = jest.fn().mockResolvedValue({ count: 42 });
    const { result } = renderHook(() => useAdminQuery('k1', fn));

    await waitFor(() => expect(result.current.data).toEqual({ count: 42 }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('hits the cache on a second mount with the same key', async () => {
    const fn1 = jest.fn().mockResolvedValue({ v: 1 });
    const { result: r1, unmount } = renderHook(() => useAdminQuery('same', fn1));
    await waitFor(() => expect(r1.current.data).toEqual({ v: 1 }));
    unmount();

    // Second render with a different fn — cache hit means fn2 is NOT called.
    const fn2 = jest.fn().mockResolvedValue({ v: 999 });
    const { result: r2 } = renderHook(() => useAdminQuery('same', fn2));
    expect(r2.current.data).toEqual({ v: 1 });
    expect(fn2).not.toHaveBeenCalled();
  });

  it('records errors without crashing', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useAdminQuery('err', fn));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('nope');
    expect(result.current.data).toBeNull();
  });

  it('refresh() re-runs the fn', async () => {
    const fn = jest.fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });
    const { result } = renderHook(() => useAdminQuery('rf', fn));

    await waitFor(() => expect(result.current.data).toEqual({ v: 1 }));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.data).toEqual({ v: 2 });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
