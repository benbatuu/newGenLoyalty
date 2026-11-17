import '../asset_urls.dart';

class TenantProfile {
  TenantProfile({
    required this.id,
    required this.name,
    required this.slug,
    required this.planCode,
    required this.planPriceTry,
    required this.subscriptionStatus,
    required this.isActive,
    this.logoUrl,
    this.primaryColor,
    this.subscriptionActivatedAt,
    this.createdAt,
    this.rewardRule,
    this.inviteHeadline,
    this.inviteSubtitle,
    this.passDescription,
    this.passPhone,
    this.passWebsiteUrl,
  });

  final String id;
  final String name;
  final String slug;
  final String planCode;
  final int planPriceTry;
  final String subscriptionStatus;
  final bool isActive;
  final String? logoUrl;
  final String? primaryColor;
  final DateTime? subscriptionActivatedAt;
  final DateTime? createdAt;
  final ({int stampsRequired, String rewardLabel})? rewardRule;
  final String? inviteHeadline;
  final String? inviteSubtitle;
  final String? passDescription;
  final String? passPhone;
  final String? passWebsiteUrl;

  factory TenantProfile.fromJson(Map<String, dynamic> json) {
    final rule = json['rewardRule'] as Map<String, dynamic>?;
    return TenantProfile(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      planCode: json['planCode'] as String? ?? 'cafe',
      planPriceTry: json['planPriceTry'] as int? ?? 990,
      subscriptionStatus: json['subscriptionStatus'] as String,
      isActive: json['isActive'] as bool? ?? true,
      logoUrl: resolveAssetUrlOrNull(json['logoUrl'] as String?),
      primaryColor: json['primaryColor'] as String?,
      subscriptionActivatedAt: json['subscriptionActivatedAt'] != null
          ? DateTime.tryParse(json['subscriptionActivatedAt'] as String)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
      rewardRule: rule == null
          ? null
          : (
              stampsRequired: rule['stampsRequired'] as int,
              rewardLabel: rule['rewardLabel'] as String,
            ),
      inviteHeadline: json['inviteHeadline'] as String?,
      inviteSubtitle: json['inviteSubtitle'] as String?,
      passDescription: json['passDescription'] as String?,
      passPhone: json['passPhone'] as String?,
      passWebsiteUrl: json['passWebsiteUrl'] as String?,
    );
  }
}


class PushSettings {
  PushSettings({
    required this.enabled,
    required this.deviceCount,
    required this.fcmConfigured,
  });

  final bool enabled;
  final int deviceCount;
  final bool fcmConfigured;

  factory PushSettings.fromJson(Map<String, dynamic> json) {
    return PushSettings(
      enabled: json['enabled'] as bool? ?? true,
      deviceCount: json['deviceCount'] as int? ?? 0,
      fcmConfigured: json['fcmConfigured'] as bool? ?? false,
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
