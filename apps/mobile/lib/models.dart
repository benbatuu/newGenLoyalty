class AuthUser {
  AuthUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.tenantId,
  });

  final String id;
  final String email;
  final String name;
  final String role;
  final String? tenantId;

  bool get isOwner => role == 'STORE_OWNER';
  bool get isCashier => role == 'CASHIER';

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
      tenantId: json['tenantId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'role': role,
        'tenantId': tenantId,
      };
}

class Customer {
  Customer({
    required this.id,
    required this.phone,
    required this.stampCount,
    required this.rewardReady,
    this.createdAt,
    this.updatedAt,
    this.ledgerCount,
  });

  final String id;
  final String phone;
  final int stampCount;
  final bool rewardReady;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final int? ledgerCount;

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] as String,
      phone: json['phone'] as String,
      stampCount: json['stampCount'] as int,
      rewardReady: json['rewardReady'] as bool,
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

class DaySummary {
  DaySummary({
    required this.stampsToday,
    required this.redeemsToday,
    required this.totalCustomers,
    this.rewardReadyCount = 0,
  });

  final int stampsToday;
  final int redeemsToday;
  final int totalCustomers;
  final int rewardReadyCount;

  factory DaySummary.fromJson(Map<String, dynamic> json) {
    return DaySummary(
      stampsToday: json['stampsToday'] as int,
      redeemsToday: json['redeemsToday'] as int,
      totalCustomers: json['totalCustomers'] as int,
      rewardReadyCount: json['rewardReadyCount'] as int? ?? 0,
    );
  }
}

class OwnerMetrics {
  OwnerMetrics({
    required this.totalCustomers,
    required this.stampsToday,
    required this.redeemsToday,
    required this.stampsMonth,
    required this.redeemsMonth,
    required this.rewardReadyCount,
  });

  final int totalCustomers;
  final int stampsToday;
  final int redeemsToday;
  final int stampsMonth;
  final int redeemsMonth;
  final int rewardReadyCount;

  factory OwnerMetrics.fromJson(Map<String, dynamic> json) {
    return OwnerMetrics(
      totalCustomers: json['totalCustomers'] as int,
      stampsToday: json['stampsToday'] as int,
      redeemsToday: json['redeemsToday'] as int,
      stampsMonth: json['stampsMonth'] as int,
      redeemsMonth: json['redeemsMonth'] as int,
      rewardReadyCount: json['rewardReadyCount'] as int,
    );
  }
}

class ActivityItem {
  ActivityItem({
    required this.id,
    required this.type,
    required this.createdAt,
    required this.phone,
    required this.customerId,
    this.byName,
    this.note,
  });

  final String id;
  final String type;
  final DateTime createdAt;
  final String phone;
  final String customerId;
  final String? byName;
  final String? note;

  factory ActivityItem.fromJson(Map<String, dynamic> json) {
    return ActivityItem(
      id: json['id'] as String,
      type: json['type'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      phone: json['phone'] as String,
      customerId: json['customerId'] as String,
      byName: json['byName'] as String?,
      note: json['note'] as String?,
    );
  }
}

class NearRewardCustomer {
  NearRewardCustomer({
    required this.id,
    required this.phone,
    required this.stampCount,
    required this.remaining,
  });

  final String id;
  final String phone;
  final int stampCount;
  final int remaining;

  factory NearRewardCustomer.fromJson(Map<String, dynamic> json) {
    return NearRewardCustomer(
      id: json['id'] as String,
      phone: json['phone'] as String,
      stampCount: json['stampCount'] as int,
      remaining: json['remaining'] as int,
    );
  }
}

class ReportsPayload {
  ReportsPayload({
    required this.stampsRequired,
    required this.rewardLabel,
    required this.totals,
    required this.recentActivity,
    required this.nearReward,
  });

  final int stampsRequired;
  final String rewardLabel;
  final Map<String, int> totals;
  final List<ActivityItem> recentActivity;
  final List<NearRewardCustomer> nearReward;

  factory ReportsPayload.fromJson(Map<String, dynamic> json) {
    final totalsRaw = json['totals'] as Map<String, dynamic>;
    return ReportsPayload(
      stampsRequired: json['stampsRequired'] as int? ?? 10,
      rewardLabel: json['rewardLabel'] as String? ?? '',
      totals: totalsRaw.map((k, v) => MapEntry(k, v as int)),
      recentActivity: (json['recentActivity'] as List<dynamic>)
          .map((e) => ActivityItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      nearReward: (json['nearReward'] as List<dynamic>)
          .map((e) => NearRewardCustomer.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class TenantProfile {
  TenantProfile({
    required this.id,
    required this.name,
    required this.slug,
    required this.planCode,
    required this.planPriceTry,
    required this.subscriptionStatus,
    this.logoUrl,
    this.primaryColor,
    this.subscriptionActivatedAt,
    this.rewardRule,
  });

  final String id;
  final String name;
  final String slug;
  final String planCode;
  final int planPriceTry;
  final String subscriptionStatus;
  final String? logoUrl;
  final String? primaryColor;
  final DateTime? subscriptionActivatedAt;
  final ({int stampsRequired, String rewardLabel})? rewardRule;

  factory TenantProfile.fromJson(Map<String, dynamic> json) {
    final rule = json['rewardRule'] as Map<String, dynamic>?;
    return TenantProfile(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      planCode: json['planCode'] as String? ?? 'cafe',
      planPriceTry: json['planPriceTry'] as int? ?? 990,
      subscriptionStatus: json['subscriptionStatus'] as String,
      logoUrl: json['logoUrl'] as String?,
      primaryColor: json['primaryColor'] as String?,
      subscriptionActivatedAt: json['subscriptionActivatedAt'] != null
          ? DateTime.tryParse(json['subscriptionActivatedAt'] as String)
          : null,
      rewardRule: rule == null
          ? null
          : (
              stampsRequired: rule['stampsRequired'] as int,
              rewardLabel: rule['rewardLabel'] as String,
            ),
    );
  }
}

class StaffMember {
  StaffMember({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.isActive,
  });

  final String id;
  final String email;
  final String name;
  final String role;
  final bool isActive;

  factory StaffMember.fromJson(Map<String, dynamic> json) {
    return StaffMember(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}
