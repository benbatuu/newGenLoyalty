import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import 'api_client.dart';
import 'firebase_options.dart';
import 'models.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.android);
}

class PushService {
  PushService._();

  static FirebaseMessaging? _messaging;
  static bool _initialized = false;

  static FirebaseOptions _platformOptions() {
    if (Platform.isIOS) return DefaultFirebaseOptions.ios;
    return DefaultFirebaseOptions.android;
  }

  static Future<void> syncForOwner(ApiClient api, AuthUser? user) async {
    if (user == null || !user.isOwner) return;
    if (!DefaultFirebaseOptions.isConfigured) return;

    if (!_initialized) {
      await Firebase.initializeApp(options: _platformOptions());
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      _messaging = FirebaseMessaging.instance;
      _initialized = true;
    }

    final settings = await api.pushSettings();
    if (!settings.enabled) {
      await _unregisterCurrent(api);
      return;
    }

    final perm = await _messaging!.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (perm.authorizationStatus == AuthorizationStatus.denied) return;

    final token = await _messaging!.getToken();
    if (token != null) {
      await api.registerPushDevice(
        token,
        Platform.isIOS ? 'IOS' : 'ANDROID',
      );
    }

    FirebaseMessaging.instance.onTokenRefresh.listen((next) {
      api.registerPushDevice(next, Platform.isIOS ? 'IOS' : 'ANDROID');
    });
  }

  static Future<void> setEnabled(ApiClient api, AuthUser? user, bool enabled) async {
    await api.updatePushSettings(enabled);
    if (enabled) {
      await syncForOwner(api, user);
    } else {
      await _unregisterCurrent(api);
    }
  }

  static Future<void> teardown(ApiClient api) async {
    await _unregisterCurrent(api);
  }

  static Future<void> _unregisterCurrent(ApiClient api) async {
    if (_messaging == null) return;
    final token = await _messaging!.getToken();
    await api.unregisterPushDevice(token);
  }
}
