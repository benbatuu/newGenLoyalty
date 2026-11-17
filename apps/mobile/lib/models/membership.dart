class MembershipPlan {
  MembershipPlan({required this.id, required this.label});

  final String id;
  final String label;

  factory MembershipPlan.fromJson(Map<String, dynamic> json) {
    return MembershipPlan(
      id: json['id'] as String,
      label: json['label'] as String? ?? '',
    );
  }
}


class MembershipState {
  MembershipState({
    required this.programName,
    required this.status,
    this.plan,
    this.plans = const [],
    this.benefitQuota = const {},
    this.expiresAt,
  });

  final String programName;
  final String status;
  final MembershipPlan? plan;
  final List<MembershipPlan> plans;
  final Map<String, int> benefitQuota;
  final String? expiresAt;

  factory MembershipState.fromJson(Map<String, dynamic> json) {
    final planRaw = json['plan'] as Map<String, dynamic>?;
    final plans = (json['plans'] as List<dynamic>? ?? [])
        .map((e) => MembershipPlan.fromJson(e as Map<String, dynamic>))
        .toList();
    final quotaRaw = json['benefitQuota'] as Map<String, dynamic>? ?? {};
    return MembershipState(
      programName: json['programName'] as String? ?? '',
      status: json['status'] as String? ?? 'inactive',
      plan: planRaw != null ? MembershipPlan.fromJson(planRaw) : null,
      plans: plans,
      benefitQuota: quotaRaw.map(
        (k, v) => MapEntry(k, (v as num).toInt()),
      ),
      expiresAt: json['expiresAt'] as String?,
    );
  }
}


class MembershipActivateResult {
  MembershipActivateResult({
    required this.status,
    required this.plan,
    this.expiresAt,
    this.benefitQuota = const {},
  });

  final String status;
  final MembershipPlan plan;
  final String? expiresAt;
  final Map<String, int> benefitQuota;

  factory MembershipActivateResult.fromJson(Map<String, dynamic> json) {
    final quotaRaw = json['benefitQuota'] as Map<String, dynamic>? ?? {};
    return MembershipActivateResult(
      status: json['status'] as String? ?? 'active',
      plan: MembershipPlan.fromJson(
        json['plan'] as Map<String, dynamic>? ?? {},
      ),
      expiresAt: json['expiresAt'] as String?,
      benefitQuota: quotaRaw.map(
        (k, v) => MapEntry(k, (v as num).toInt()),
      ),
    );
  }
}


class MembershipUseBenefitResult {
  MembershipUseBenefitResult({
    required this.benefitLabel,
    required this.remaining,
  });

  final String benefitLabel;
  final int remaining;

  factory MembershipUseBenefitResult.fromJson(Map<String, dynamic> json) {
    return MembershipUseBenefitResult(
      benefitLabel: json['benefitLabel'] as String? ?? '',
      remaining: json['remaining'] as int? ?? 0,
    );
  }
}
