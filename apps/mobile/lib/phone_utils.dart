/// Türkiye cep telefonu — 10 hane, 5 ile başlar (0 opsiyonel).
String normalizePhoneDigits(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.length == 11 && digits.startsWith('0')) {
    return digits.substring(1);
  }
  return digits;
}

bool isValidPhoneInput(String raw) {
  final d = normalizePhoneDigits(raw);
  return d.length == 10 && d.startsWith('5');
}

String? phoneValidationHint(String raw) {
  if (raw.trim().isEmpty) return null;
  final d = normalizePhoneDigits(raw);
  if (d.isEmpty) return 'Geçerli bir telefon numarası girin';
  if (d.length < 10) return '10 haneli numara girin (5xx xxx xx xx)';
  if (!d.startsWith('5')) return 'Cep numarası 5 ile başlamalı';
  if (d.length > 10) return 'Fazla hane — 10 hane yeterli';
  return null;
}
