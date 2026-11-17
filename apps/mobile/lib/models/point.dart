class PointCategory {
  PointCategory({
    required this.categoryId,
    this.label,
    this.multiplier = 1,
  });

  final String categoryId;
  final String? label;
  final num multiplier;

  factory PointCategory.fromJson(Map<String, dynamic> json) {
    return PointCategory(
      categoryId: json['categoryId'] as String,
      label: json['label'] as String?,
      multiplier: json['multiplier'] as num? ?? 1,
    );
  }
}


class PointRedeemOption {
  PointRedeemOption({
    required this.pointCost,
    required this.rewardLabel,
    required this.affordable,
  });

  final int pointCost;
  final String rewardLabel;
  final bool affordable;

  factory PointRedeemOption.fromJson(Map<String, dynamic> json) {
    return PointRedeemOption(
      pointCost: json['pointCost'] as int? ?? 0,
      rewardLabel: json['rewardLabel'] as String? ?? '',
      affordable: json['affordable'] as bool? ?? false,
    );
  }
}


class PointCustomerState {
  PointCustomerState({
    required this.balance,
    this.categories = const [],
    this.redeemOptions = const [],
  });

  final int balance;
  final List<PointCategory> categories;
  final List<PointRedeemOption> redeemOptions;

  factory PointCustomerState.fromJson(Map<String, dynamic> json) {
    final cats = (json['categories'] as List<dynamic>? ?? [])
        .map((e) => PointCategory.fromJson(e as Map<String, dynamic>))
        .toList();
    final redeems = (json['redeemOptions'] as List<dynamic>? ?? [])
        .map((e) => PointRedeemOption.fromJson(e as Map<String, dynamic>))
        .toList();
    return PointCustomerState(
      balance: json['balance'] as int? ?? 0,
      categories: cats,
      redeemOptions: redeems,
    );
  }
}


class PointRedeemResult {
  PointRedeemResult({required this.balance, required this.rewardLabel});

  final int balance;
  final String rewardLabel;

  factory PointRedeemResult.fromJson(Map<String, dynamic> json) {
    return PointRedeemResult(
      balance: json['balance'] as int? ?? 0,
      rewardLabel: json['rewardLabel'] as String? ?? '',
    );
  }
}


class PointEarnPreview {
  PointEarnPreview({
    required this.amountTry,
    required this.finalPoints,
    this.campaignMultiplier = 1,
  });

  final String amountTry;
  final int finalPoints;
  final num campaignMultiplier;

  factory PointEarnPreview.fromJson(Map<String, dynamic> json) {
    return PointEarnPreview(
      amountTry: json['amountTry'] as String? ?? '',
      finalPoints: json['finalPoints'] as int? ?? 0,
      campaignMultiplier: json['campaignMultiplier'] as num? ?? 1,
    );
  }
}


class PointEarnResult {
  PointEarnResult({required this.balance, required this.earned});

  final int balance;
  final int earned;

  factory PointEarnResult.fromJson(Map<String, dynamic> json) {
    return PointEarnResult(
      balance: json['balance'] as int? ?? 0,
      earned: json['earned'] as int? ?? 0,
    );
  }
}
