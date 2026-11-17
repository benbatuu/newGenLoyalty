import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'models.dart';
import 'push_service.dart';

class AuthState extends ChangeNotifier {
  AuthState(this.api) {
    api.onSessionExpired = _handleSessionExpired;
  }

  final ApiClient api;
  bool ready = false;
  String? error;
  bool _handlingExpiry = false;

  AuthUser? get user => api.user;
  bool get isLoggedIn => user != null;

  void _handleSessionExpired() {
    if (_handlingExpiry) return;
    _handlingExpiry = true;
    logout(skipPushTeardown: true).whenComplete(() {
      _handlingExpiry = false;
    });
  }

  Future<void> bootstrap() async {
    await api.loadSession();
    if (api.user != null) {
      await api.validateSession();
    }
    ready = true;
    notifyListeners();
    if (user?.isOwner == true) {
      await PushService.syncForOwner(api, user);
    }
  }

  Future<bool> login(String email, String password) async {
    error = null;
    try {
      await api.login(email.trim(), password);
      notifyListeners();
      if (user?.isOwner == true) {
        await PushService.syncForOwner(api, user);
      }
      return true;
    } on ApiException catch (e) {
      error = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> logout({bool skipPushTeardown = false}) async {
    if (user?.isOwner == true && !skipPushTeardown) {
      await PushService.teardown(api);
    }
    await api.clearSession();
    notifyListeners();
  }
}
