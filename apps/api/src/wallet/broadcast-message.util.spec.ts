import {
  stripBroadcastStamps,
  withBroadcastMarker,
} from './broadcast-message.util';

describe('broadcast-message.util', () => {
  describe('stripBroadcastStamps', () => {
    it('returns trimmed text without stamps', () => {
      expect(stripBroadcastStamps('  Merhabalar  ')).toBe('Merhabalar');
    });

    it('removes legacy time stamps', () => {
      expect(stripBroadcastStamps('Merhabalar · 00:26 · 00:31')).toBe(
        'Merhabalar',
      );
    });

    it('removes invisible markers', () => {
      expect(stripBroadcastStamps('Merhabalar​')).toBe('Merhabalar');
    });
  });

  describe('withBroadcastMarker', () => {
    it('adds a marker only when the text is unchanged', () => {
      expect(withBroadcastMarker('Merhabalar', 'Merhabalar')).toBe(
        'Merhabalar​',
      );
    });

    it('keeps text as-is when it differs from the previous one', () => {
      expect(withBroadcastMarker('Merhabalar', 'Eski')).toBe('Merhabalar');
    });
  });
});
