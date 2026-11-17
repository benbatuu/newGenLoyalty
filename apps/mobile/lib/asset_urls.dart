import 'config.dart';

String? _mediaKeyFromAssetUrl(String raw) {
  final mediaIdx = raw.indexOf('/media/');
  if (mediaIdx >= 0) {
    final key = raw.substring(mediaIdx + '/media/'.length).split('?').first;
    return key.isEmpty ? null : key;
  }

  try {
    final uri = Uri.parse(raw);
    if (uri.host.endsWith('.r2.cloudflarestorage.com')) {
      var key = uri.path.replaceFirst(RegExp(r'^/'), '');
      if (!key.startsWith('tenants/')) {
        final parts = key.split('/');
        if (parts.length >= 2 && parts[1] == 'tenants') {
          key = parts.sublist(1).join('/');
        }
      }
      if (key.startsWith('tenants/')) {
        return key.split('?').first;
      }
    }
    if (uri.path.startsWith('/media/')) {
      final key = uri.path.substring('/media/'.length).split('?').first;
      return key.isEmpty ? null : key;
    }
  } catch (_) {
    /* ignore */
  }
  return null;
}

/// API / R2 / uploads görsel yollarını mobil istemcinin erişebileceği tam URL'ye çevirir.
String resolveAssetUrl(String? url) {
  final raw = url?.trim();
  if (raw == null || raw.isEmpty) return '';

  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

  final base = kApiBaseUrl.replaceAll(RegExp(r'/+$'), '');

  final mediaKey = _mediaKeyFromAssetUrl(raw);
  if (mediaKey != null) {
    final qIdx = raw.indexOf('?');
    final query = qIdx >= 0 ? raw.substring(qIdx) : '';
    return '$base/media/$mediaKey$query';
  }

  final uploadsIdx = raw.indexOf('/uploads/');
  if (uploadsIdx >= 0) {
    return '$base${raw.substring(uploadsIdx)}';
  }

  if (raw.startsWith('/uploads/') || raw.startsWith('/media/')) {
    return '$base$raw';
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      final uri = Uri.parse(raw);
      if (uri.path.startsWith('/uploads/') || uri.path.startsWith('/media/')) {
        return uri.hasQuery ? '$base${uri.path}?${uri.query}' : '$base${uri.path}';
      }
    } catch (_) {
      return raw;
    }
    return raw;
  }

  return raw;
}

String? resolveAssetUrlOrNull(String? url) {
  final resolved = resolveAssetUrl(url);
  return resolved.isEmpty ? null : resolved;
}
