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


class DayPoint {
  DayPoint({
    required this.date,
    required this.label,
    required this.stamps,
    required this.redeems,
  });

  final String date;
  final String label;
  final int stamps;
  final int redeems;

  factory DayPoint.fromJson(Map<String, dynamic> json) {
    return DayPoint(
      date: json['date'] as String? ?? '',
      label: json['label'] as String? ?? '',
      stamps: json['stamps'] as int? ?? 0,
      redeems: json['redeems'] as int? ?? 0,
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
    required this.applePassCount,
    required this.registeredDevices,
    required this.staffCount,
    required this.activeCustomers,
    required this.stampsRequired,
    this.rewardLabel,
    required this.last7Days,
  });

  final int totalCustomers;
  final int stampsToday;
  final int redeemsToday;
  final int stampsMonth;
  final int redeemsMonth;
  final int rewardReadyCount;
  final int applePassCount;
  final int registeredDevices;
  final int staffCount;
  final int activeCustomers;
  final int stampsRequired;
  final String? rewardLabel;
  final List<DayPoint> last7Days;

  factory OwnerMetrics.fromJson(Map<String, dynamic> json) {
    return OwnerMetrics(
      totalCustomers: json['totalCustomers'] as int? ?? 0,
      stampsToday: json['stampsToday'] as int? ?? 0,
      redeemsToday: json['redeemsToday'] as int? ?? 0,
      stampsMonth: json['stampsMonth'] as int? ?? 0,
      redeemsMonth: json['redeemsMonth'] as int? ?? 0,
      rewardReadyCount: json['rewardReadyCount'] as int? ?? 0,
      applePassCount: json['applePassCount'] as int? ?? 0,
      registeredDevices: json['registeredDevices'] as int? ?? 0,
      staffCount: json['staffCount'] as int? ?? 0,
      activeCustomers: json['activeCustomers'] as int? ?? 0,
      stampsRequired: json['stampsRequired'] as int? ?? 10,
      rewardLabel: json['rewardLabel'] as String?,
      last7Days: (json['last7Days'] as List<dynamic>? ?? [])
          .map((e) => DayPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
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


class ProgramTypeBreakdown {
  ProgramTypeBreakdown({
    required this.type,
    required this.label,
    required this.events,
    required this.stamps,
    required this.redeems,
    required this.pointEarn,
    required this.cashbackEarn,
    required this.cashbackRedeem,
  });

  final String type;
  final String label;
  final int events;
  final int stamps;
  final int redeems;
  final int pointEarn;
  final int cashbackEarn;
  final int cashbackRedeem;

  factory ProgramTypeBreakdown.fromJson(Map<String, dynamic> json) {
    return ProgramTypeBreakdown(
      type: json['type'] as String? ?? '',
      label: json['label'] as String? ?? '',
      events: json['events'] as int? ?? 0,
      stamps: json['stamps'] as int? ?? 0,
      redeems: json['redeems'] as int? ?? 0,
      pointEarn: json['pointEarn'] as int? ?? 0,
      cashbackEarn: json['cashbackEarn'] as int? ?? 0,
      cashbackRedeem: json['cashbackRedeem'] as int? ?? 0,
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
    this.period,
    this.byProgramType = const [],
    this.dailyTrend = const [],
  });

  final int stampsRequired;
  final String rewardLabel;
  final Map<String, int> totals;
  final List<ActivityItem> recentActivity;
  final List<NearRewardCustomer> nearReward;
  final ({int stamps, int redeems, int newCustomers})? period;
  final List<ProgramTypeBreakdown> byProgramType;
  final List<DayPoint> dailyTrend;

  factory ReportsPayload.fromJson(Map<String, dynamic> json) {
    final totalsRaw = json['totals'] as Map<String, dynamic>? ?? {};
    final periodRaw = json['period'] as Map<String, dynamic>?;
    return ReportsPayload(
      stampsRequired: json['stampsRequired'] as int? ?? 10,
      rewardLabel: json['rewardLabel'] as String? ?? '',
      totals: totalsRaw.map((k, v) => MapEntry(k, v as int)),
      recentActivity: (json['recentActivity'] as List<dynamic>? ?? [])
          .map((e) => ActivityItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      nearReward: (json['nearReward'] as List<dynamic>? ?? [])
          .map((e) => NearRewardCustomer.fromJson(e as Map<String, dynamic>))
          .toList(),
      period: periodRaw != null
          ? (
              stamps: periodRaw['stamps'] as int? ?? 0,
              redeems: periodRaw['redeems'] as int? ?? 0,
              newCustomers: periodRaw['newCustomers'] as int? ?? 0,
            )
          : null,
      byProgramType: (json['byProgramType'] as List<dynamic>? ?? [])
          .map((e) => ProgramTypeBreakdown.fromJson(e as Map<String, dynamic>))
          .toList(),
      dailyTrend: (json['dailyTrend'] as List<dynamic>? ?? [])
          .map((e) => DayPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}


class AnalyticsSummary {
  AnalyticsSummary({
    required this.days,
    required this.totals,
    this.daily = const [],
  });

  final int days;
  final AnalyticsTotals totals;
  final List<AnalyticsDayPoint> daily;

  factory AnalyticsSummary.fromJson(Map<String, dynamic> json) {
    return AnalyticsSummary(
      days: json['days'] as int? ?? 30,
      totals: AnalyticsTotals.fromJson(
        json['totals'] as Map<String, dynamic>? ?? {},
      ),
      daily: (json['daily'] as List<dynamic>? ?? [])
          .map((e) => AnalyticsDayPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}


class AnalyticsTotals {
  AnalyticsTotals({
    required this.stamps,
    required this.redeems,
    required this.newCustomers,
    required this.pointEarned,
    required this.cashbackEarnKurus,
    required this.cashbackRedeemKurus,
  });

  final int stamps;
  final int redeems;
  final int newCustomers;
  final int pointEarned;
  final int cashbackEarnKurus;
  final int cashbackRedeemKurus;

  factory AnalyticsTotals.fromJson(Map<String, dynamic> json) {
    return AnalyticsTotals(
      stamps: json['stamps'] as int? ?? 0,
      redeems: json['redeems'] as int? ?? 0,
      newCustomers: json['newCustomers'] as int? ?? 0,
      pointEarned: json['pointEarned'] as int? ?? 0,
      cashbackEarnKurus: json['cashbackEarnKurus'] as int? ?? 0,
      cashbackRedeemKurus: json['cashbackRedeemKurus'] as int? ?? 0,
    );
  }
}


class AnalyticsDayPoint {
  AnalyticsDayPoint({
    required this.date,
    required this.stamps,
    required this.redeems,
    required this.newCustomers,
    required this.pointEarned,
    required this.cashbackEarnKurus,
    required this.cashbackRedeemKurus,
  });

  final String date;
  final int stamps;
  final int redeems;
  final int newCustomers;
  final int pointEarned;
  final int cashbackEarnKurus;
  final int cashbackRedeemKurus;

  factory AnalyticsDayPoint.fromJson(Map<String, dynamic> json) {
    return AnalyticsDayPoint(
      date: json['date'] as String? ?? '',
      stamps: json['stamps'] as int? ?? 0,
      redeems: json['redeems'] as int? ?? 0,
      newCustomers: json['newCustomers'] as int? ?? 0,
      pointEarned: json['pointEarned'] as int? ?? 0,
      cashbackEarnKurus: json['cashbackEarnKurus'] as int? ?? 0,
      cashbackRedeemKurus: json['cashbackRedeemKurus'] as int? ?? 0,
    );
  }
}


class CashbackLiability {
  CashbackLiability({
    required this.outstandingCreditKurus,
    required this.outstandingCreditTry,
    required this.earnedTodayKurus,
    required this.redeemedTodayKurus,
    required this.customerCount,
  });

  final int outstandingCreditKurus;
  final String outstandingCreditTry;
  final int earnedTodayKurus;
  final int redeemedTodayKurus;
  final int customerCount;

  factory CashbackLiability.fromJson(Map<String, dynamic> json) {
    return CashbackLiability(
      outstandingCreditKurus: json['outstandingCreditKurus'] as int? ?? 0,
      outstandingCreditTry: json['outstandingCreditTry'] as String? ?? '0,00',
      earnedTodayKurus: json['earnedTodayKurus'] as int? ?? 0,
      redeemedTodayKurus: json['redeemedTodayKurus'] as int? ?? 0,
      customerCount: json['customerCount'] as int? ?? 0,
    );
  }
}
