import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Encrypted storage for auth tokens with one-time SharedPreferences migration.
class SecureTokenStore {
  SecureTokenStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessKey = 'ngl_access';
  static const _refreshKey = 'ngl_refresh';
  static const _userKey = 'ngl_user';

  static const _legacyAccessKey = 'ngl_access';
  static const _legacyRefreshKey = 'ngl_refresh';
  static const _legacyUserKey = 'ngl_user';

  Future<({String? access, String? refresh, String? userJson})> read() async {
    var access = await _storage.read(key: _accessKey);
    var refresh = await _storage.read(key: _refreshKey);
    var userJson = await _storage.read(key: _userKey);

    if (access != null || refresh != null || userJson != null) {
      return (access: access, refresh: refresh, userJson: userJson);
    }

    final prefs = await SharedPreferences.getInstance();
    access = prefs.getString(_legacyAccessKey);
    refresh = prefs.getString(_legacyRefreshKey);
    userJson = prefs.getString(_legacyUserKey);

    if (access != null || refresh != null || userJson != null) {
      await write(access: access, refresh: refresh, userJson: userJson);
      await prefs.remove(_legacyAccessKey);
      await prefs.remove(_legacyRefreshKey);
      await prefs.remove(_legacyUserKey);
    }

    return (access: access, refresh: refresh, userJson: userJson);
  }

  Future<void> write({
    String? access,
    String? refresh,
    String? userJson,
  }) async {
    if (access == null || refresh == null || userJson == null) {
      await clear();
      return;
    }
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
    await _storage.write(key: _userKey, value: userJson);
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _userKey);
  }
}
