import 'package:flutter/foundation.dart';

/// Bildirim gönderimi sırasında shell gezinmesini kilitlemek için.
class NotificationSendController extends ChangeNotifier {
  bool _sending = false;

  bool get sending => _sending;

  void setSending(bool value) {
    if (_sending == value) return;
    _sending = value;
    notifyListeners();
  }
}
