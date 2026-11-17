import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ngl_mobile/api_client.dart';
import 'package:ngl_mobile/secure_token_store.dart';

class _MemorySecureStore extends SecureTokenStore {
  _MemorySecureStore(this._data);

  final Map<String, String> _data;

  @override
  Future<({String? access, String? refresh, String? userJson})> read() async {
    return (
      access: _data['access'],
      refresh: _data['refresh'],
      userJson: _data['user'],
    );
  }

  @override
  Future<void> write({
    String? access,
    String? refresh,
    String? userJson,
  }) async {
    _data['access'] = access ?? '';
    _data['refresh'] = refresh ?? '';
    _data['user'] = userJson ?? '';
  }

  @override
  Future<void> clear() async => _data.clear();
}

void main() {
  test('refresh 401 clears session and fires onSessionExpired', () async {
    var expired = false;
    final store = _MemorySecureStore({
      'access': 'old-access',
      'refresh': 'old-refresh',
      'user': jsonEncode({
        'id': 'u1',
        'email': 'a@b.c',
        'name': 'Test',
        'role': 'CASHIER',
      }),
    });

    final client = ApiClient(
      client: MockClient((request) async {
        if (request.url.path.endsWith('/auth/refresh')) {
          return http.Response('Unauthorized', 401);
        }
        return http.Response('{}', 200);
      }),
      tokenStore: store,
    );
    client.onSessionExpired = () => expired = true;

    await client.loadSession();
    expect(client.user, isNotNull);

    final ok = await client.tryRefresh();
    expect(ok, isFalse);
    expect(client.user, isNull);
    expect(expired, isTrue);
  });
}
