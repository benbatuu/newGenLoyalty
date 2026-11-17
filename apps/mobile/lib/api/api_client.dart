import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models.dart';
import '../secure_token_store.dart';
import 'api_exception.dart';

export 'analytics_api.dart';
export 'api_exception.dart';
export 'crm_api.dart';
export 'loyalty_api.dart';
export 'stamps_api.dart';
export 'tenant_api.dart';

class ApiClient {
  ApiClient({
    http.Client? client,
    SecureTokenStore? tokenStore,
  })  : _http = client ?? http.Client(),
        _tokenStore = tokenStore ?? SecureTokenStore();

  final http.Client _http;
  final SecureTokenStore _tokenStore;

  String? _access;
  String? _refresh;
  AuthUser? user;
  Future<bool>? _refreshInFlight;

  /// Called when refresh fails or session is invalidated server-side.
  void Function()? onSessionExpired;

  Future<void> loadSession() async {
    final tokens = await _tokenStore.read();
    _access = tokens.access;
    _refresh = tokens.refresh;
    if (tokens.userJson != null) {
      user = AuthUser.fromJson(
        jsonDecode(tokens.userJson!) as Map<String, dynamic>,
      );
    }
  }

  Future<void> persistSession() => _persist();

  Future<void> _persist() async {
    if (_access == null || _refresh == null || user == null) {
      await _tokenStore.clear();
      return;
    }
    await _tokenStore.write(
      access: _access,
      refresh: _refresh,
      userJson: jsonEncode(user!.toJson()),
    );
  }

  Future<void> clearSession() async {
    _access = null;
    _refresh = null;
    user = null;
    await _persist();
  }

  Future<void> _expireSession() async {
    final hadSession = _access != null || user != null;
    await clearSession();
    if (hadSession) onSessionExpired?.call();
  }

  Future<AuthUser> login(String email, String password) async {
    final res = await _http.post(
      Uri.parse('$kApiBaseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final body = decodeResponse(res);
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, messageOf(body));
    }
    _access = body['accessToken'] as String;
    _refresh = body['refreshToken'] as String;
    user = AuthUser.fromJson(body['user'] as Map<String, dynamic>);
    await _persist();
    return user!;
  }

  Future<bool> validateSession() async {
    if (_access == null) return false;
    try {
      await request('GET', '/auth/me', retry: false);
      return true;
    } on ApiException catch (e) {
      if (e.status == 401 || e.status == 403) {
        await _expireSession();
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> tryRefresh() => _tryRefresh();

  Future<bool> _tryRefresh() async {
    if (_refreshInFlight != null) return _refreshInFlight!;
    _refreshInFlight = _doRefresh();
    try {
      return await _refreshInFlight!;
    } finally {
      _refreshInFlight = null;
    }
  }

  Future<bool> _doRefresh() async {
    if (_refresh == null) return false;
    final res = await _http.post(
      Uri.parse('$kApiBaseUrl/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': _refresh}),
    );
    if (res.statusCode >= 400) {
      if (res.statusCode == 401 || res.statusCode == 403) {
        await _expireSession();
      }
      return false;
    }
    final body = decodeResponse(res);
    _access = body['accessToken'] as String;
    _refresh = body['refreshToken'] as String;
    user = AuthUser.fromJson(body['user'] as Map<String, dynamic>);
    await _persist();
    return true;
  }

  Future<Map<String, dynamic>> request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool retry = true,
  }) async {
    final uri = Uri.parse('$kApiBaseUrl$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (_access != null) 'Authorization': 'Bearer $_access',
    };
    late http.Response res;
    switch (method) {
      case 'GET':
        res = await _http.get(uri, headers: headers);
      case 'POST':
        res = await _http.post(
          uri,
          headers: headers,
          body: body == null ? null : jsonEncode(body),
        );
      case 'PATCH':
        res = await _http.patch(
          uri,
          headers: headers,
          body: body == null ? null : jsonEncode(body),
        );
      case 'DELETE':
        res = await _http.delete(
          uri,
          headers: headers,
          body: body == null ? null : jsonEncode(body),
        );
      default:
        throw ApiException(0, 'Unsupported method $method');
    }

    if (res.statusCode == 401 && retry) {
      final ok = await _tryRefresh();
      if (ok) return request(method, path, body: body, retry: false);
      throw ApiException(401, 'Oturum süresi doldu');
    }

    final decoded =
        res.body.isEmpty ? <String, dynamic>{} : decodeResponse(res);
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, messageOf(decoded));
    }
    return decoded;
  }

  Future<List<dynamic>> requestList(String path) async {
    final uri = Uri.parse('$kApiBaseUrl$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (_access != null) 'Authorization': 'Bearer $_access',
    };
    var res = await _http.get(uri, headers: headers);
    if (res.statusCode == 401) {
      final ok = await _tryRefresh();
      if (!ok) throw ApiException(401, 'Oturum süresi doldu');
      res = await _http.get(uri, headers: {
        ...headers,
        'Authorization': 'Bearer $_access',
      });
    }
    final decoded = jsonDecode(res.body);
    if (res.statusCode >= 400) {
      throw ApiException(
        res.statusCode,
        messageOf(decoded is Map<String, dynamic> ? decoded : {}),
      );
    }
    return decoded as List<dynamic>;
  }

  Map<String, dynamic> decodeResponse(http.Response res) {
    final raw = jsonDecode(res.body);
    if (raw is Map<String, dynamic>) return raw;
    return {'data': raw};
  }

  String messageOf(Map<String, dynamic> body) {
    final m = body['message'];
    if (m is List) return m.join(', ');
    if (m is String) return m;
    return 'İstek başarısız';
  }
}
