import {
  stripBroadcastStamps,
  withBroadcastStamp,
} from './broadcast-message.util';

describe('broadcast-message.util', () => {
  describe('stripBroadcastStamps', () => {
    it('returns trimmed text without stamps', () => {
      expect(stripBroadcastStamps('  Merhabalar  ')).toBe('Merhabalar');
    });

    it('removes one trailing time stamp', () => {
      expect(stripBroadcastStamps('Merhabalar · 00:26')).toBe('Merhabalar');
    });

    it('removes multiple accumulated stamps', () => {
      expect(stripBroadcastStamps('Merhabalar · 00:26 · 00:31')).toBe(
        'Merhabalar',
      );
    });
  });

  describe('withBroadcastStamp', () => {
    it('appends Turkish time suffix', () => {
      const at = new Date('2026-09-03T00:26:00+03:00');
      expect(withBroadcastStamp('Merhabalar', at)).toMatch(
        /^Merhabalar · \d{2}:\d{2}$/,
      );
    });
  });
});
