import 'package:flutter_test/flutter_test.dart';
import 'package:ngl_mobile/models/pass_barcode.dart';

void main() {
  group('tryParsePassBarcode', () {
    test('parses customer-only id', () {
      final parsed = tryParsePassBarcode('cm4abc123def456ghi789jkl');
      expect(parsed, isNotNull);
      expect(parsed!.customerId, 'cm4abc123def456ghi789jkl');
      expect(parsed.isProgramSpecific, isFalse);
    });

    test('parses customer:program composite', () {
      final parsed = tryParsePassBarcode(
        'cm4abc123def456ghi789jkl:cm4xyz987654321fedcba098',
      );
      expect(parsed, isNotNull);
      expect(parsed!.customerId, 'cm4abc123def456ghi789jkl');
      expect(parsed.programId, 'cm4xyz987654321fedcba098');
      expect(parsed.isProgramSpecific, isTrue);
    });

    test('rejects invite urls', () {
      expect(
        tryParsePassBarcode('https://app.example/wallet/invite?token=abc'),
        isNull,
      );
    });
  });
}
