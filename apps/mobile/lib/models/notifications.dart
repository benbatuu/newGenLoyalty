class BroadcastItem {
  BroadcastItem({
    required this.id,
    required this.message,
    required this.synced,
    required this.devices,
    required this.createdAt,
  });

  final String id;
  final String message;
  final int synced;
  final int devices;
  final DateTime createdAt;

  factory BroadcastItem.fromJson(Map<String, dynamic> json) {
    return BroadcastItem(
      id: json['id'] as String,
      message: json['message'] as String? ?? '',
      synced: json['synced'] as int? ?? 0,
      devices: json['devices'] as int? ?? 0,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}


class NotifyStatus {
  NotifyStatus({
    this.lastMessage,
    this.lastSentAt,
    required this.applePassCount,
    required this.registeredDevices,
    this.notifyIconUrl,
    required this.name,
    this.primaryColor,
    required this.history,
  });

  final String? lastMessage;
  final DateTime? lastSentAt;
  final int applePassCount;
  final int registeredDevices;
  final String? notifyIconUrl;
  final String name;
  final String? primaryColor;
  final List<BroadcastItem> history;

  factory NotifyStatus.fromJson(Map<String, dynamic> json) {
    return NotifyStatus(
      lastMessage: json['lastMessage'] as String?,
      lastSentAt: json['lastSentAt'] != null
          ? DateTime.tryParse(json['lastSentAt'] as String)
          : null,
      applePassCount: json['applePassCount'] as int? ?? 0,
      registeredDevices: json['registeredDevices'] as int? ?? 0,
      notifyIconUrl: json['notifyIconUrl'] as String?,
      name: json['name'] as String? ?? '',
      primaryColor: json['primaryColor'] as String?,
      history: (json['history'] as List<dynamic>? ?? [])
          .map((e) => BroadcastItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
