import {
  clientIpFromRequest,
  consumeRateLimit,
} from './simple-rate-limit';

describe('consumeRateLimit', () => {
  it('allows up to the limit then blocks', () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    expect(consumeRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(consumeRateLimit(key, 2, 60_000).ok).toBe(true);
    const blocked = consumeRateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
  });
});

describe('clientIpFromRequest', () => {
  it('prefers x-forwarded-for first hop', () => {
    const ip = clientIpFromRequest({
      headers: {
        get: (name: string) =>
          name === 'x-forwarded-for' ? '1.2.3.4, 10.0.0.1' : undefined,
      },
    });
    expect(ip).toBe('1.2.3.4');
  });
});
