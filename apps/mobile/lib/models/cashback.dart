import 'customer.dart';

class CashbackCategory {
  CashbackCategory({
    required this.categoryId,
    this.label,
    this.multiplier = 1,
  });

  final String categoryId;
  final String? label;
  final num multiplier;

  factory CashbackCategory.fromJson(Map<String, dynamic> json) {
    return CashbackCategory(
      categoryId: json['categoryId'] as String,
      label: json['label'] as String?,
      multiplier: json['multiplier'] as num? ?? 1,
    );
  }
}


class CashbackCustomerState {
  CashbackCustomerState({
    required this.balanceTry,
    required this.earnPercent,
    this.balanceKurus = 0,
    this.minRedeemKurus = 0,
    this.maxRedeemPercent = 50,
    this.canRedeem = false,
    this.programName = '',
    this.categories = const [],
  });

  final int balanceKurus;
  final String balanceTry;
  final num earnPercent;
  final int minRedeemKurus;
  final num maxRedeemPercent;
  final bool canRedeem;
  final String programName;
  final List<CashbackCategory> categories;

  factory CashbackCustomerState.fromJson(Map<String, dynamic> json) {
    final cats = (json['categories'] as List<dynamic>? ?? [])
        .map((e) => CashbackCategory.fromJson(e as Map<String, dynamic>))
        .toList();
    return CashbackCustomerState(
      balanceKurus: json['balanceKurus'] as int? ?? 0,
      balanceTry: json['balanceTry'] as String? ?? '0,00',
      earnPercent: json['earnPercent'] as num? ?? 0,
      minRedeemKurus: json['minRedeemKurus'] as int? ?? 0,
      maxRedeemPercent: json['maxRedeemPercent'] as num? ?? 50,
      canRedeem: json['canRedeem'] as bool? ?? false,
      programName: json['programName'] as String? ?? '',
      categories: cats,
    );
  }
}


class CashbackEarnPreview {
  CashbackEarnPreview({
    required this.amountTry,
    required this.finalEarnKurus,
    required this.earnPercent,
    this.campaignMultiplier = 1,
    this.campaignLabel,
    this.requiresConfirmation = false,
  });

  final String amountTry;
  final int finalEarnKurus;
  final num earnPercent;
  final num campaignMultiplier;
  final String? campaignLabel;
  final bool requiresConfirmation;

  String get earnedTry {
    final tryVal = finalEarnKurus / 100;
    return tryVal.toStringAsFixed(2).replaceAll('.', ',');
  }

  factory CashbackEarnPreview.fromJson(Map<String, dynamic> json) {
    return CashbackEarnPreview(
      amountTry: json['amountTry'] as String? ?? '',
      finalEarnKurus: json['finalEarnKurus'] as int? ?? 0,
      earnPercent: json['earnPercent'] as num? ?? 0,
      campaignMultiplier: json['campaignMultiplier'] as num? ?? 1,
      campaignLabel: json['campaignLabel'] as String?,
      requiresConfirmation: json['requiresConfirmation'] as bool? ?? false,
    );
  }
}


class CashbackEarnResult {
  CashbackEarnResult({
    required this.balanceTry,
    required this.earnedTry,
    this.balanceKurus = 0,
    this.earnedKurus = 0,
  });

  final int balanceKurus;
  final String balanceTry;
  final int earnedKurus;
  final String earnedTry;

  factory CashbackEarnResult.fromJson(Map<String, dynamic> json) {
    return CashbackEarnResult(
      balanceKurus: json['balanceKurus'] as int? ?? 0,
      balanceTry: json['balanceTry'] as String? ?? '',
      earnedKurus: json['earnedKurus'] as int? ?? 0,
      earnedTry: json['earnedTry'] as String? ?? '',
    );
  }
}


class CashbackRedeemResult {
  CashbackRedeemResult({
    required this.balanceTry,
    required this.redeemedTry,
  });

  final String balanceTry;
  final String redeemedTry;

  factory CashbackRedeemResult.fromJson(Map<String, dynamic> json) {
    return CashbackRedeemResult(
      balanceTry: json['balanceTry'] as String? ?? '',
      redeemedTry: json['redeemedTry'] as String? ?? '',
    );
  }
}


class CashbackScanResult {
  CashbackScanResult({
    required this.customer,
    required this.earnedTry,
    required this.newBalanceTry,
    this.earnPercent,
  });

  final Customer customer;
  final String earnedTry;
  final String newBalanceTry;
  final num? earnPercent;

  factory CashbackScanResult.fromJson(Map<String, dynamic> json) {
    final preview = json['preview'] as Map<String, dynamic>?;
    return CashbackScanResult(
      customer: Customer.fromJson(json['customer'] as Map<String, dynamic>),
      earnedTry: json['earnedTry'] as String? ?? '',
      newBalanceTry: json['newBalanceTry'] as String? ?? '',
      earnPercent: preview?['earnPercent'] as num?,
    );
  }
}

/// Wallet pass barcode: `customerId` or `customerId:programId`
