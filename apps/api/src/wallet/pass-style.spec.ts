import { resolvePassStyle } from './pass-style';

describe('resolvePassStyle', () => {
  it('maps EVENT_CARD to eventTicket', () => {
    expect(resolvePassStyle('EVENT_CARD')).toBe('eventTicket');
  });

  it('maps every other program type to storeCard', () => {
    for (const t of ['STAMP_CARD', 'MULTI_STAMP', 'POINT_CARD', 'DISCOUNT_CARD', 'MEMBERSHIP_CARD', 'CASHBACK_CARD', 'STAFF_CARD']) {
      expect(resolvePassStyle(t)).toBe('storeCard');
    }
  });

  it('defaults to storeCard when type is missing', () => {
    expect(resolvePassStyle(null)).toBe('storeCard');
    expect(resolvePassStyle(undefined)).toBe('storeCard');
  });
});
