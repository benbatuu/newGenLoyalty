class ParsedPassBarcode {
  ParsedPassBarcode({required this.customerId, this.programId});

  final String customerId;
  final String? programId;

  bool get isProgramSpecific => programId != null && programId!.isNotEmpty;
}


ParsedPassBarcode? tryParsePassBarcode(String raw) {
  final code = raw.trim();
  if (code.isEmpty) return null;
  if (RegExp(r'^https?://', caseSensitive: false).hasMatch(code) ||
      code.toLowerCase().contains('wallet/invite')) {
    return null;
  }

  bool validId(String id) =>
      RegExp(r'^[a-z][a-z0-9]{20,36}$', caseSensitive: false).hasMatch(id);

  final colonIdx = code.indexOf(':');
  if (colonIdx > 0) {
    final customerId = code.substring(0, colonIdx);
    final programId = code.substring(colonIdx + 1);
    if (!validId(customerId) || !validId(programId)) return null;
    return ParsedPassBarcode(customerId: customerId, programId: programId);
  }

  if (!validId(code)) return null;
  return ParsedPassBarcode(customerId: code);
}
