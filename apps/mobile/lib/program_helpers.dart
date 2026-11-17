import 'package:flutter/material.dart';

import 'models.dart';
import 'theme.dart';

const _typeLabels = <String, String>{
  'STAMP_CARD': 'Damga kartı',
  'MULTI_STAMP': 'Çoklu damga',
  'POINT_CARD': 'Puan kartı',
  'CASHBACK_CARD': 'Cashback',
  'DISCOUNT_CARD': 'İndirim',
  'EVENT_CARD': 'Etkinlik',
  'MEMBERSHIP_CARD': 'Üyelik',
  'STAFF_CARD': 'Personel',
  'LEGACY': 'Genel (eski)',
};

String programTypeLabel(String type) => _typeLabels[type] ?? type;

String programCardSummary(ProgramSummary program) {
  final tier = program.tiers.isNotEmpty ? program.tiers.first : null;
  if (program.type == 'CASHBACK_CARD') {
    final pct = program.config?['earnPercent'];
    return pct != null ? '%$pct cashback' : 'Harcama tutarına göre cashback';
  }
  if (tier == null) return programTypeLabel(program.type);
  if (program.type == 'STAMP_CARD' || program.type == 'MULTI_STAMP') {
    return '${tier.threshold} damga · ${tier.rewardLabel}';
  }
  if (program.type == 'POINT_CARD') {
    return tier.rewardLabel != 'Ödül'
        ? tier.rewardLabel
        : 'Harcanabilir puan';
  }
  return tier.rewardLabel;
}

String activityTypeLabel(String type) {
  switch (type) {
    case 'STAMP':
      return 'Damga';
    case 'REDEEM':
      return 'Ödül kullanıldı';
    case 'ADJUST':
      return 'Düzeltme';
    case 'POINT_EARN':
      return 'Puan kazanıldı';
    case 'POINT_REDEEM':
      return 'Puan kullanıldı';
    case 'CASHBACK_EARN':
      return 'Cashback kazanıldı';
    case 'CASHBACK_REDEEM':
      return 'Cashback kullanıldı';
    case 'DISCOUNT_USE':
      return 'İndirim uygulandı';
    case 'EVENT_CHECKIN':
      return 'Etkinlik girişi';
    case 'STAFF_REDEEM':
      return 'Personel hakkı';
    case 'MEMBERSHIP_USE':
      return 'Üyelik hakkı';
    case 'REFERRAL':
      return 'Referans';
    default:
      return type;
  }
}

IconData activityTypeIcon(String type) {
  switch (type) {
    case 'STAMP':
    case 'POINT_EARN':
    case 'CASHBACK_EARN':
      return Icons.add_circle_outline_rounded;
    case 'REDEEM':
    case 'POINT_REDEEM':
    case 'CASHBACK_REDEEM':
    case 'STAFF_REDEEM':
    case 'MEMBERSHIP_USE':
      return Icons.card_giftcard_rounded;
    case 'DISCOUNT_USE':
      return Icons.local_offer_outlined;
    case 'EVENT_CHECKIN':
      return Icons.event_available_outlined;
    case 'ADJUST':
      return Icons.tune_rounded;
    default:
      return Icons.receipt_long_outlined;
  }
}

Color activityTypeColor(BuildContext context, String type) {
  final c = context.colors;
  switch (type) {
    case 'STAMP':
    case 'POINT_EARN':
      return c.accent;
    case 'CASHBACK_EARN':
      return kTeal;
    case 'REDEEM':
    case 'POINT_REDEEM':
    case 'CASHBACK_REDEEM':
      return kGold;
    case 'DISCOUNT_USE':
      return kBrand;
    case 'EVENT_CHECKIN':
      return kAmber;
    default:
      return c.muted;
  }
}

String formatKurusTry(int kurus) {
  return '₺${(kurus / 100).toStringAsFixed(2).replaceAll('.', ',')}';
}

String breakdownSummary(ProgramTypeBreakdown row) {
  final parts = <String>[];
  if (row.stamps > 0) parts.add('${row.stamps} damga');
  if (row.redeems > 0) parts.add('${row.redeems} ödül');
  if (row.pointEarn > 0) parts.add('${row.pointEarn} puan işlemi');
  if (row.cashbackEarn > 0) parts.add('${row.cashbackEarn} cashback kazanım');
  if (row.cashbackRedeem > 0) {
    parts.add('${row.cashbackRedeem} cashback kullanım');
  }
  if (parts.isEmpty) return '${row.events} işlem';
  return parts.join(' · ');
}
