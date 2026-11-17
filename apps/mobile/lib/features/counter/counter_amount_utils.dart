int? parseTryToKurus(String raw) {
  final normalized = raw.trim().replaceAll(',', '.');
  if (normalized.isEmpty) return null;
  final n = double.tryParse(normalized);
  if (n == null || n < 0) return null;
  return (n * 100).round();
}
