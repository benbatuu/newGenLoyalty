import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'models.dart';

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
  }

  Future<bool> login(String email, String password) async {
    error = null;
    try {
      await api.login(email.trim(), password);
      notifyListeners();
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
    await api.clearSession();
    notifyListeners();
  }
}
