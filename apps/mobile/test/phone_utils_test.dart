import 'package:flutter_test/flutter_test.dart';
import 'package:ngl_mobile/phone_utils.dart';

void main() {
  group('normalizePhoneDigits', () {
    test('strips non-digits and leading zero', () {
      expect(normalizePhoneDigits('0532 123 45 67'), '5321234567');
    });

    test('keeps 10-digit mobile', () {
      expect(normalizePhoneDigits('5321234567'), '5321234567');
    });
  });

  group('isValidPhoneInput', () {
    test('accepts valid TR mobile', () {
      expect(isValidPhoneInput('5321234567'), isTrue);
      expect(isValidPhoneInput('05321234567'), isTrue);
    });

    test('rejects invalid numbers', () {
      expect(isValidPhoneInput('4321234567'), isFalse);
      expect(isValidPhoneInput('532123'), isFalse);
    });
  });

  group('phoneValidationHint', () {
    test('returns null for empty input', () {
      expect(phoneValidationHint(''), isNull);
    });

    test('hints for incomplete number', () {
      expect(phoneValidationHint('532'), isNotNull);
    });
  });
}
