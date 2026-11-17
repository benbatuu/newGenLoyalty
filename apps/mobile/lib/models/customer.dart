class Customer {
  Customer({
    required this.id,
    required this.phone,
    required this.stampCount,
    required this.rewardReady,
    this.hasWallet = false,
    this.displayName,
    this.birthMonth,
    this.birthDay,
    this.consentAt,
    this.createdAt,
    this.updatedAt,
    this.ledgerCount,
  });

  final String id;
  final String phone;
  final int stampCount;
  final bool rewardReady;
  final bool hasWallet;
  final String? displayName;
  final int? birthMonth;
  final int? birthDay;
  final DateTime? consentAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final int? ledgerCount;

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] as String,
      phone: json['phone'] as String,
      stampCount: json['stampCount'] as int,
      rewardReady: json['rewardReady'] as bool,
      hasWallet: json['hasWallet'] as bool? ?? false,
      displayName: json['displayName'] as String?,
      birthMonth: json['birthMonth'] as int?,
      birthDay: json['birthDay'] as int?,
      consentAt: json['consentAt'] != null
          ? DateTime.tryParse(json['consentAt'] as String)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
      ledgerCount: json['ledgerCount'] as int?,
    );
  }
}


class CustomerNote {
  CustomerNote({
    required this.id,
    required this.body,
    required this.createdAt,
  });

  final String id;
  final String body;
  final DateTime createdAt;

  factory CustomerNote.fromJson(Map<String, dynamic> json) {
    return CustomerNote(
      id: json['id'] as String,
      body: json['body'] as String? ?? '',
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}


class CustomerDirectory {
  CustomerDirectory({
    required this.stampsRequired,
    required this.rewardLabel,
    required this.customers,
  });

  final int stampsRequired;
  final String rewardLabel;
  final List<Customer> customers;

  factory CustomerDirectory.fromJson(Map<String, dynamic> json) {
    final list = (json['customers'] as List<dynamic>)
        .map((e) => Customer.fromJson(e as Map<String, dynamic>))
        .toList();
    return CustomerDirectory(
      stampsRequired: json['stampsRequired'] as int? ?? 10,
      rewardLabel: json['rewardLabel'] as String? ?? '',
      customers: list,
    );
  }
}


class StampResult {
  StampResult({
    required this.customer,
    required this.stampsRequired,
    required this.rewardLabel,
    this.walletInviteUrl,
  });

  final Customer customer;
  final int stampsRequired;
  final String rewardLabel;
  final String? walletInviteUrl;

  factory StampResult.fromJson(Map<String, dynamic> json) {
    return StampResult(
      customer: Customer.fromJson(json['customer'] as Map<String, dynamic>),
      stampsRequired: json['stampsRequired'] as int? ?? 0,
      rewardLabel: json['rewardLabel'] as String? ?? '',
      walletInviteUrl: json['walletInviteUrl'] as String?,
    );
  }
}
