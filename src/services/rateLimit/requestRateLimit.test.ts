import { decideCooldown, SPAM_BLOCK_SEC } from './requestRateLimit';

describe('decideCooldown', () => {
  const base = 1_700_000_000_000;

  it('allows immediately when no previous submissions', () => {
    const d = decideCooldown([], base);
    expect(d.reason).toBe('allowed');
    expect(d.waitMs).toBe(0);
    expect(d.countInWindow).toBe(0);
  });

  it('waits 30s after the 1st submission', () => {
    const d = decideCooldown([base - 1000], base);
    expect(d.reason).toBe('cooldown');
    // 30 seconds - 1 second already elapsed = 29s
    expect(d.waitMs).toBe(29_000);
    expect(d.countInWindow).toBe(1);
  });

  it('waits 2 minutes after the 2nd submission', () => {
    const d = decideCooldown([base - 30_000, base - 1000], base);
    expect(d.reason).toBe('cooldown');
    expect(d.waitMs).toBe(120_000 - 1000);
    expect(d.countInWindow).toBe(2);
  });

  it('waits 5 minutes after the 3rd submission', () => {
    const d = decideCooldown(
      [base - 300_000, base - 120_000, base - 1000],
      base,
    );
    expect(d.reason).toBe('cooldown');
    expect(d.waitMs).toBe(300_000 - 1000);
    expect(d.countInWindow).toBe(3);
  });

  it('waits 15 minutes after the 4th submission', () => {
    const d = decideCooldown(
      [base - 900_000, base - 600_000, base - 300_000, base - 1000],
      base,
    );
    expect(d.reason).toBe('cooldown');
    expect(d.waitMs).toBe(900_000 - 1000);
    expect(d.countInWindow).toBe(4);
  });

  it('hard-blocks for 1 hour when count reaches 5+', () => {
    const stamps = Array.from({ length: 5 }, (_, i) => base - (5 - i) * 1000);
    const d = decideCooldown(stamps, base);
    expect(d.reason).toBe('spam-block');
    expect(d.waitMs).toBe(SPAM_BLOCK_SEC * 1000 - 1000);
    expect(d.countInWindow).toBe(5);
  });

  it('prunes entries older than the 1h tracking window', () => {
    const d = decideCooldown([base - 60 * 60 * 1000 - 1], base);
    expect(d.reason).toBe('allowed');
    expect(d.countInWindow).toBe(0);
  });

  it('returns 0 wait when the cooldown already elapsed', () => {
    const d = decideCooldown([base - 60_000], base);
    // Count=1 means 30s cooldown, but 60s already passed → allowed.
    expect(d.reason).toBe('allowed');
    expect(d.waitMs).toBe(0);
  });
});
