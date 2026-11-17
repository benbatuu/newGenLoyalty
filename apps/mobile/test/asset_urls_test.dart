import 'package:flutter_test/flutter_test.dart';
import 'package:ngl_mobile/asset_urls.dart';

void main() {
  group('resolveAssetUrl', () {
    test('returns empty for null/blank', () {
      expect(resolveAssetUrl(null), '');
      expect(resolveAssetUrl('  '), '');
    });

    test('resolves relative media path', () {
      final url = resolveAssetUrl('/media/tenants/t1/logo.png');
      expect(url, contains('/media/tenants/t1/logo.png'));
      expect(url, startsWith('https://'));
    });

    test('resolves uploads path', () {
      final url = resolveAssetUrl('/uploads/abc.jpg');
      expect(url, endsWith('/uploads/abc.jpg'));
    });

    test('passes through data URLs', () {
      const data = 'data:image/png;base64,abc';
      expect(resolveAssetUrl(data), data);
    });
  });
}
