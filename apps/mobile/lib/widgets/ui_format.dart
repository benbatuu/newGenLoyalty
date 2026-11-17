import 'package:flutter/material.dart';

void dismissKeyboard() {
  FocusManager.instance.primaryFocus?.unfocus();
}

void onTapOutsideDismissKeyboard(PointerDownEvent _) {
  dismissKeyboard();
}

/// Tap boş alana veya kaydırmaya klavyeyi kapatır.
class KeyboardDismiss extends StatelessWidget {
  const KeyboardDismiss({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: dismissKeyboard,
      behavior: HitTestBehavior.translucent,
      child: child,
    );
  }
}

String formatPhone(String phone) {
  if (phone.contains('**')) return phone;
  if (phone.length == 10) {
    return '0${phone.substring(0, 3)} ${phone.substring(3, 6)} ${phone.substring(6)}';
  }
  return '0$phone';
}

/// API'den gelen maskeli telefonu olduğu gibi gösterir.
String displayPhone(String phone) {
  if (phone.contains('**')) return phone;
  return formatPhone(phone);
}

String shortDate(DateTime? dt) {
  if (dt == null) return '—';
  final l = dt.toLocal();
  return '${l.day.toString().padLeft(2, '0')}.${l.month.toString().padLeft(2, '0')} ${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
}

const _monthNames = [
  '',
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

String formatBirthday(int? month, int? day) {
  if (month == null || day == null || month < 1 || month > 12) return '—';
  return '$day ${_monthNames[month]}';
}

String formatDateTr(DateTime? dt, {bool withTime = false}) {
  if (dt == null) return '—';
  final l = dt.toLocal();
  final base = '${l.day} ${_monthNames[l.month]} ${l.year}';
  if (!withTime) return base;
  return '$base · ${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
}

/// Apple pass tekrarında eklenen ` · HH:MM` soneklerini temizler.
String stripBroadcastStamps(String raw) {
  var s = raw.trim();
  final suffix = RegExp(r'( · \d{1,2}[:.]\d{2})+$');
  while (suffix.hasMatch(s)) {
    s = s.replaceAll(suffix, '').trim();
  }
  return s;
}
