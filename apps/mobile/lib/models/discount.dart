class DiscountEffective {
  DiscountEffective({
    required this.discountType,
    required this.value,
    required this.label,
    this.tierApplied,
  });

  final String discountType;
  final num value;
  final String label;
  final String? tierApplied;

  factory DiscountEffective.fromJson(Map<String, dynamic> json) {
    return DiscountEffective(
      discountType: json['discountType'] as String? ?? 'PERCENT',
      value: json['value'] as num? ?? 0,
      label: json['label'] as String? ?? '',
      tierApplied: json['tierApplied'] as String?,
    );
  }
}


class DiscountLimits {
  DiscountLimits({
    this.totalUses = 0,
    this.usesToday = 0,
    this.remainingToday,
    this.remainingTotal,
  });

  final int totalUses;
  final int usesToday;
  final int? remainingToday;
  final int? remainingTotal;

  factory DiscountLimits.fromJson(Map<String, dynamic> json) {
    return DiscountLimits(
      totalUses: json['totalUses'] as int? ?? 0,
      usesToday: json['usesToday'] as int? ?? 0,
      remainingToday: json['remainingToday'] as int?,
      remainingTotal: json['remainingTotal'] as int?,
    );
  }
}


class DiscountCustomerState {
  DiscountCustomerState({
    required this.programName,
    required this.valid,
    this.invalidReason,
    this.effective,
    this.applicableCategories = const [],
    required this.limits,
  });

  final String programName;
  final bool valid;
  final String? invalidReason;
  final DiscountEffective? effective;
  final List<String> applicableCategories;
  final DiscountLimits limits;

  factory DiscountCustomerState.fromJson(Map<String, dynamic> json) {
    final effectiveRaw = json['effective'] as Map<String, dynamic>?;
    final cats = (json['applicableCategories'] as List<dynamic>? ?? [])
        .map((e) => e as String)
        .toList();
    return DiscountCustomerState(
      programName: json['programName'] as String? ?? '',
      valid: json['valid'] as bool? ?? false,
      invalidReason: json['invalidReason'] as String?,
      effective: effectiveRaw != null
          ? DiscountEffective.fromJson(effectiveRaw)
          : null,
      applicableCategories: cats,
      limits: DiscountLimits.fromJson(
        json['limits'] as Map<String, dynamic>? ?? {},
      ),
    );
  }
}


class DiscountVerifyResult {
  DiscountVerifyResult({
    required this.programName,
    required this.valid,
    required this.effective,
    required this.limits,
  });

  final String programName;
  final bool valid;
  final DiscountEffective effective;
  final DiscountLimits limits;

  factory DiscountVerifyResult.fromJson(Map<String, dynamic> json) {
    return DiscountVerifyResult(
      programName: json['programName'] as String? ?? '',
      valid: json['valid'] as bool? ?? false,
      effective: DiscountEffective.fromJson(
        json['effective'] as Map<String, dynamic>? ?? {},
      ),
      limits: DiscountLimits.fromJson(
        json['limits'] as Map<String, dynamic>? ?? {},
      ),
    );
  }
}


class DiscountApplyResult {
  DiscountApplyResult({
    required this.applied,
    required this.effective,
    required this.limits,
  });

  final bool applied;
  final DiscountEffective effective;
  final DiscountLimits limits;

  factory DiscountApplyResult.fromJson(Map<String, dynamic> json) {
    return DiscountApplyResult(
      applied: json['applied'] as bool? ?? false,
      effective: DiscountEffective.fromJson(
        json['effective'] as Map<String, dynamic>? ?? {},
      ),
      limits: DiscountLimits.fromJson(
        json['limits'] as Map<String, dynamic>? ?? {},
      ),
    );
  }
}
