class EventCustomerState {
  EventCustomerState({
    required this.programName,
    required this.eventName,
    required this.entryLimit,
    required this.entriesUsed,
    required this.entriesRemaining,
    required this.canCheckIn,
    this.venue,
  });

  final String programName;
  final String eventName;
  final int entryLimit;
  final int entriesUsed;
  final int entriesRemaining;
  final bool canCheckIn;
  final String? venue;

  factory EventCustomerState.fromJson(Map<String, dynamic> json) {
    return EventCustomerState(
      programName: json['programName'] as String? ?? '',
      eventName: json['eventName'] as String? ?? '',
      entryLimit: json['entryLimit'] as int? ?? 0,
      entriesUsed: json['entriesUsed'] as int? ?? 0,
      entriesRemaining: json['entriesRemaining'] as int? ?? 0,
      canCheckIn: json['canCheckIn'] as bool? ?? false,
      venue: json['venue'] as String?,
    );
  }
}


class EventCheckInResult {
  EventCheckInResult({
    required this.entryNumber,
    required this.entriesRemaining,
    required this.entryLimit,
  });

  final int entryNumber;
  final int entriesRemaining;
  final int entryLimit;

  factory EventCheckInResult.fromJson(Map<String, dynamic> json) {
    return EventCheckInResult(
      entryNumber: json['entryNumber'] as int? ?? 0,
      entriesRemaining: json['entriesRemaining'] as int? ?? 0,
      entryLimit: json['entryLimit'] as int? ?? 0,
    );
  }
}
