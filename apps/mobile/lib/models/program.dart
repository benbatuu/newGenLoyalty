class ProgramTier {
  ProgramTier({
    required this.id,
    required this.threshold,
    required this.rewardLabel,
    required this.redeemCost,
    this.laneId,
  });

  final String id;
  final int threshold;
  final String rewardLabel;
  final int redeemCost;
  final String? laneId;

  factory ProgramTier.fromJson(Map<String, dynamic> json) {
    return ProgramTier(
      id: json['id'] as String,
      threshold: json['threshold'] as int? ?? 10,
      rewardLabel: json['rewardLabel'] as String? ?? '',
      redeemCost: json['redeemCost'] as int? ?? json['threshold'] as int? ?? 10,
      laneId: json['laneId'] as String?,
    );
  }
}


class StampChipOption {
  StampChipOption({
    required this.id,
    required this.label,
    this.multiplier = 1,
  });

  final String id;
  final String label;
  final int multiplier;
}


class LoyaltyProgram {
  LoyaltyProgram({
    required this.type,
    required this.tiers,
    this.mode,
    this.stampOptions = const [],
  });

  final String type;
  final String? mode;
  final List<ProgramTier> tiers;
  final List<StampChipOption> stampOptions;

  bool get isMultiStamp => type == 'MULTI_STAMP';

  factory LoyaltyProgram.fromJson(Map<String, dynamic> json) {
    final config = json['config'] as Map<String, dynamic>? ?? {};
    final mode = config['mode'] as String?;
    final tiers = (json['tiers'] as List<dynamic>? ?? [])
        .map((e) => ProgramTier.fromJson(e as Map<String, dynamic>))
        .toList();
    final options = <StampChipOption>[];
    if (mode == 'MULTIPLIER') {
      for (final g in config['productGroups'] as List<dynamic>? ?? []) {
        final m = g as Map<String, dynamic>;
        options.add(StampChipOption(
          id: m['id'] as String,
          label: m['label'] as String? ?? '',
          multiplier: m['multiplier'] as int? ?? 1,
        ));
      }
    } else if (mode == 'LANES') {
      for (final l in config['lanes'] as List<dynamic>? ?? []) {
        final m = l as Map<String, dynamic>;
        options.add(StampChipOption(
          id: m['id'] as String,
          label: m['label'] as String? ?? '',
        ));
      }
    }
    return LoyaltyProgram(
      type: json['type'] as String? ?? 'STAMP_CARD',
      mode: mode,
      tiers: tiers,
      stampOptions: options,
    );
  }
}


class ProgramSummary {
  ProgramSummary({
    required this.id,
    required this.type,
    required this.name,
    this.isPrimary = false,
    this.config,
    this.tiers = const [],
  });

  final String id;
  final String type;
  final String name;
  final bool isPrimary;
  final Map<String, dynamic>? config;
  final List<ProgramTier> tiers;

  bool get isMultiStamp => type == 'MULTI_STAMP';

  String? get multiStampMode => config?['mode'] as String?;

  List<StampChipOption> get stampOptions {
    final mode = multiStampMode;
    final options = <StampChipOption>[];
    if (mode == 'MULTIPLIER') {
      for (final g in config?['productGroups'] as List<dynamic>? ?? []) {
        final m = g as Map<String, dynamic>;
        options.add(StampChipOption(
          id: m['id'] as String,
          label: m['label'] as String? ?? '',
          multiplier: m['multiplier'] as int? ?? 1,
        ));
      }
    } else if (mode == 'LANES') {
      for (final l in config?['lanes'] as List<dynamic>? ?? []) {
        final m = l as Map<String, dynamic>;
        options.add(StampChipOption(
          id: m['id'] as String,
          label: m['label'] as String? ?? '',
        ));
      }
    }
    return options;
  }

  List<ProgramTier> tiersForLane(String? laneId) {
    if (multiStampMode != 'LANES' || laneId == null) return tiers;
    return tiers.where((t) => t.laneId == laneId).toList();
  }

  factory ProgramSummary.fromJson(Map<String, dynamic> json) {
    final tiers = (json['tiers'] as List<dynamic>? ?? [])
        .map((e) => ProgramTier.fromJson(e as Map<String, dynamic>))
        .toList();
    return ProgramSummary(
      id: json['id'] as String,
      type: json['type'] as String? ?? '',
      name: json['name'] as String? ?? '',
      isPrimary: json['isPrimary'] as bool? ?? false,
      config: json['config'] as Map<String, dynamic>?,
      tiers: tiers,
    );
  }
}


class ProgramsHub {
  ProgramsHub({required this.programs});

  final List<ProgramSummary> programs;

  List<ProgramSummary> programsOfType(String type) =>
      programs.where((p) => p.type == type).toList();

  ProgramSummary? firstOfType(String type) {
    for (final p in programs) {
      if (p.type == type) return p;
    }
    return null;
  }

  ProgramSummary? get pointProgram => firstOfType('POINT_CARD');

  ProgramSummary? get cashbackProgram => firstOfType('CASHBACK_CARD');

  ProgramSummary? get discountProgram => firstOfType('DISCOUNT_CARD');

  ProgramSummary? get eventProgram => firstOfType('EVENT_CARD');

  ProgramSummary? get membershipProgram => firstOfType('MEMBERSHIP_CARD');

  ProgramSummary? get staffProgram => firstOfType('STAFF_CARD');

  ProgramSummary? get primaryMultiStamp {
    for (final p in programs) {
      if (p.type == 'MULTI_STAMP' && p.isPrimary) return p;
    }
    return null;
  }

  factory ProgramsHub.fromJson(Map<String, dynamic> json) {
    final list = (json['programs'] as List<dynamic>? ?? [])
        .map((e) => ProgramSummary.fromJson(e as Map<String, dynamic>))
        .toList();
    return ProgramsHub(programs: list);
  }
}
