import { resolveCorsOrigins, isCorsOriginAllowed } from './cors-origins';

describe('cors-origins', () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it('allows configured admin and web URLs', () => {
    process.env = {
      ...env,
      ADMIN_URL: 'https://admin.example.com/',
      WEB_URL: 'https://app.example.com',
    };
    expect(resolveCorsOrigins()).toEqual([
      'https://admin.example.com',
      'https://app.example.com',
    ]);
    expect(isCorsOriginAllowed('https://admin.example.com')).toBe(true);
    expect(isCorsOriginAllowed('https://evil.example.com')).toBe(false);
  });

  it('allows requests without origin (native clients)', () => {
    expect(isCorsOriginAllowed(undefined)).toBe(true);
  });
});
