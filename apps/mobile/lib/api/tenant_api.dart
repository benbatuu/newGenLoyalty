import '../models.dart';
import 'api_client.dart';

extension TenantApi on ApiClient {
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
      'fcmToken': ?fcmToken,
    });
  }

  Future<void> cancelSubscription() async {
    await request('POST', '/tenants/me/subscription/cancel');
  }

  Future<void> suspendAccount() async {
    await request('POST', '/tenants/me/subscription/suspend');
  }
}
