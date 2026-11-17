import 'package:flutter_test/flutter_test.dart';
import 'package:ngl_mobile/models.dart';

void main() {
  group('tryParsePassBarcode', () {
    test('parses customer id only', () {
      final r = tryParsePassBarcode('clx9abcdefghijklmnopqr12');
      expect(r, isNotNull);
      expect(r!.customerId, 'clx9abcdefghijklmnopqr12');
      expect(r.programId, isNull);
      expect(r.isProgramSpecific, isFalse);
    });

    test('parses customer:program pair', () {
      final r = tryParsePassBarcode(
        'clx9abcdefghijklmnopqr12:clx9programidabcdefghijkl',
      );
      expect(r, isNotNull);
      expect(r!.isProgramSpecific, isTrue);
      expect(r.programId, 'clx9programidabcdefghijkl');
    });

    test('rejects URLs and invite links', () {
      expect(tryParsePassBarcode('https://example.com/wallet'), isNull);
      expect(tryParsePassBarcode('wallet/invite/abc'), isNull);
    });

    test('rejects invalid ids', () {
      expect(tryParsePassBarcode('12345'), isNull);
      expect(tryParsePassBarcode(''), isNull);
    });
  });
}
