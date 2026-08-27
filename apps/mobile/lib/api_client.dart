import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';
import 'models.dart';

class ApiException implements Exception {
  ApiException(this.status, this.message);
  final int status;
  final String message;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client}) : _http = client ?? http.Client();

  final http.Client _http;
  static const _accessKey = 'ngl_access';
  static const _refreshKey = 'ngl_refresh';
  static const _userKey = 'ngl_user';

  String? _access;
  String? _refresh;
  AuthUser? user;
  Future<bool>? _refreshInFlight;

  Future<void> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    _access = prefs.getString(_accessKey);
    _refresh = prefs.getString(_refreshKey);
    final raw = prefs.getString(_userKey);
    if (raw != null) {
      user = AuthUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    if (_access == null || _refresh == null || user == null) {
      await prefs.remove(_accessKey);
      await prefs.remove(_refreshKey);
      await prefs.remove(_userKey);
      return;
    }
    await prefs.setString(_accessKey, _access!);
    await prefs.setString(_refreshKey, _refresh!);
    await prefs.setString(_userKey, jsonEncode(user!.toJson()));
  }

  Future<void> clearSession() async {
    _access = null;
    _refresh = null;
    user = null;
    await _persist();
  }

  Future<AuthUser> login(String email, String password) async {
    final res = await _http.post(
      Uri.parse('$kApiBaseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final body = _decode(res);
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, _messageOf(body));
    }
    _access = body['accessToken'] as String;
    _refresh = body['refreshToken'] as String;
    user = AuthUser.fromJson(body['user'] as Map<String, dynamic>);
    await _persist();
    return user!;
  }

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
        await clearSession();
      }
      return false;
    }
    final body = _decode(res);
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

    final decoded = res.body.isEmpty
        ? <String, dynamic>{}
        : _decode(res);
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, _messageOf(decoded));
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
        _messageOf(decoded is Map<String, dynamic> ? decoded : {}),
      );
    }
    return decoded as List<dynamic>;
  }

  Map<String, dynamic> _decode(http.Response res) {
    final raw = jsonDecode(res.body);
    if (raw is Map<String, dynamic>) return raw;
    return {'data': raw};
  }

  String _messageOf(Map<String, dynamic> body) {
    final m = body['message'];
    if (m is List) return m.join(', ');
    if (m is String) return m;
    return 'İstek başarısız';
  }

  // Domain helpers
  Future<List<Customer>> findCustomers(String phone) async {
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    final list = await requestList(
      '/stamps/customers?phone=${Uri.encodeQueryComponent(digits)}',
    );
    return list
        .map((e) => Customer.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<StampResult> registerCustomer(String phone) async {
    final data = await request('POST', '/stamps/customers', body: {
      'phone': phone,
    });
    return StampResult.fromJson(data);
  }

  Future<StampResult> addStamp(String customerId) async {
    final data = await request(
      'POST',
      '/stamps/customers/$customerId/stamp',
      body: {'source': 'cashier'},
    );
    return StampResult.fromJson(data);
  }

  /// Stamp by Wallet pass QR payload (customer id).
  Future<StampResult> stampByScan(String code) async {
    final data = await request(
      'POST',
      '/stamps/scan',
      body: {'code': code},
    );
    return StampResult.fromJson(data);
  }

  Future<({Customer customer, String redeemed})> redeem(
    String customerId,
  ) async {
    final data = await request('POST', '/stamps/customers/$customerId/redeem');
    return (
      customer: Customer.fromJson(data['customer'] as Map<String, dynamic>),
      redeemed: data['redeemed'] as String? ?? '',
    );
  }

  Future<DaySummary> daySummary() async {
    final data = await request('GET', '/stamps/summary/today');
    return DaySummary.fromJson(data);
  }

  Future<OwnerMetrics> ownerMetrics() async {
    final data = await request('GET', '/tenants/me/metrics');
    return OwnerMetrics.fromJson(data);
  }

  Future<NotifyStatus> notificationStatus() async {
    final data = await request('GET', '/tenants/me/notifications');
    return NotifyStatus.fromJson(data);
  }

  Future<({String message, int synced, int devices})> sendNotification(
    String message,
  ) async {
    final data = await request('POST', '/tenants/me/notifications', body: {
      'message': message,
    });
    return (
      message: data['message'] as String? ?? message,
      synced: data['synced'] as int? ?? 0,
      devices: data['devices'] as int? ?? 0,
    );
  }

  Future<TenantRewardSettings> tenantRewardSettings() async {
    final data = await request('GET', '/tenants/me');
    return TenantRewardSettings.fromTenantJson(data);
  }

  Future<void> updateRewardRule({
    required int stampsRequired,
    required String rewardLabel,
  }) async {
    await request('PATCH', '/tenants/me/reward-rule', body: {
      'stampsRequired': stampsRequired,
      'rewardLabel': rewardLabel,
    });
  }

  Future<void> patchTenant(Map<String, dynamic> body) async {
    await request('PATCH', '/tenants/me', body: body);
  }

  Future<String> walletInviteLink(String customerId) async {
    final data = await request(
      'GET',
      '/stamps/customers/$customerId/wallet-invite',
    );
    return data['walletInviteUrl'] as String;
  }

  Future<String> invitePreviewLink() async {
    final data = await request('POST', '/tenants/me/invite-preview-link');
    return data['url'] as String;
  }

  Future<void> inviteStaff({
    required String name,
    required String email,
    required String password,
  }) async {
    await request('POST', '/tenants/me/staff', body: {
      'name': name,
      'email': email,
      'password': password,
    });
  }

  Future<String> staffResetLink(String userId) async {
    final data = await request(
      'POST',
      '/tenants/me/staff/$userId/reset-link',
    );
    return data['resetUrl'] as String;
  }

  Future<CustomerDirectory> customerDirectory({
    String? q,
    String filter = 'all',
  }) async {
    final params = <String, String>{
      'filter': filter,
      'take': '80',
      if (q != null && q.isNotEmpty) 'q': q,
    };
    final qs = params.entries
        .map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}')
        .join('&');
    final data = await request('GET', '/stamps/customers/directory?$qs');
    return CustomerDirectory.fromJson(data);
  }

  Future<ReportsPayload> reports() async {
    final data = await request('GET', '/stamps/reports');
    return ReportsPayload.fromJson(data);
  }

  Future<TenantProfile> tenantMe() async {
    final data = await request('GET', '/tenants/me');
    return TenantProfile.fromJson(data);
  }

  Future<List<StaffMember>> staff() async {
    final list = await requestList('/tenants/me/staff');
    return list
        .map((e) => StaffMember.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<PushSettings> pushSettings() async {
    final data = await request('GET', '/users/me/push/settings');
    return PushSettings.fromJson(data);
  }

  Future<PushSettings> updatePushSettings(bool enabled) async {
    final data = await request('PATCH', '/users/me/push/settings', body: {
      'enabled': enabled,
    });
    return PushSettings.fromJson(data);
  }

  Future<void> registerPushDevice(String fcmToken, String platform) async {
    await request('POST', '/users/me/push/devices', body: {
      'fcmToken': fcmToken,
      'platform': platform,
    });
  }

  Future<void> unregisterPushDevice([String? fcmToken]) async {
    await request('DELETE', '/users/me/push/devices', body: {
      if (fcmToken != null) 'fcmToken': fcmToken,
    });
  }
}
