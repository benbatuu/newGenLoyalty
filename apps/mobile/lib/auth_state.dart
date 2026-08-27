import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'models.dart';
import 'push_service.dart';

class AuthState extends ChangeNotifier {
  AuthState(this.api);

  final ApiClient api;
  bool ready = false;
  String? error;

  AuthUser? get user => api.user;
  bool get isLoggedIn => user != null;

  Future<void> bootstrap() async {
    await api.loadSession();
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

  Future<void> logout() async {
    if (user?.isOwner == true) {
      await PushService.teardown(api);
    }
    await api.clearSession();
    notifyListeners();
  }
}
