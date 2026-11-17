class StaffUsage {
  StaffUsage({
    this.monthlySpendKurus = 0,
    this.monthlyBudgetKurus = 0,
    this.dailyRedeemCount = 0,
    this.dailyLimit = 1,
  });

  final int monthlySpendKurus;
  final int monthlyBudgetKurus;
  final int dailyRedeemCount;
  final int dailyLimit;

  factory StaffUsage.fromJson(Map<String, dynamic> json) {
    return StaffUsage(
      monthlySpendKurus: json['monthlySpendKurus'] as int? ?? 0,
      monthlyBudgetKurus: json['monthlyBudgetKurus'] as int? ?? 0,
      dailyRedeemCount: json['dailyRedeemCount'] as int? ?? 0,
      dailyLimit: json['dailyLimit'] as int? ?? 1,
    );
  }
}


class StaffState {
  StaffState({
    required this.programName,
    required this.usage,
    this.requireManagerPinAbove,
  });

  final String programName;
  final StaffUsage usage;
  final num? requireManagerPinAbove;

  factory StaffState.fromJson(Map<String, dynamic> json) {
    final config = json['config'] as Map<String, dynamic>? ?? {};
    return StaffState(
      programName: json['programName'] as String? ?? '',
      usage: StaffUsage.fromJson(
        json['usage'] as Map<String, dynamic>? ?? {},
      ),
      requireManagerPinAbove: config['requireManagerPinAbove'] as num?,
    );
  }
}


class StaffRedeemResult {
  StaffRedeemResult({required this.ok, required this.amountKurus});

  final bool ok;
  final int amountKurus;

  factory StaffRedeemResult.fromJson(Map<String, dynamic> json) {
    return StaffRedeemResult(
      ok: json['ok'] as bool? ?? false,
      amountKurus: json['amountKurus'] as int? ?? 0,
    );
  }
}
