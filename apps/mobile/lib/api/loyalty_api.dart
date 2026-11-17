import '../models.dart';
import 'api_client.dart';

extension LoyaltyApi on ApiClient {
  Future<LoyaltyProgram?> loyaltyProgram() async {
    try {
      final data = await request('GET', '/programs/me');
      return LoyaltyProgram.fromJson(data);
    } on ApiException catch (e) {
      if (e.status == 404) return null;
      rethrow;
    }
  }

  Future<ProgramsHub?> programsHub() async {
    try {
      final data = await request('GET', '/programs');
      return ProgramsHub.fromJson(data);
    } on ApiException catch (e) {
      if (e.status == 404 || e.status == 403) return null;
      rethrow;
    }
  }

  Future<PointCustomerState?> pointCustomerState(
    String programId,
    String customerId,
  ) async {
    try {
      final data = await request(
        'GET',
        '/programs/$programId/points/customers/$customerId',
      );
      return PointCustomerState.fromJson(data);
    } on ApiException catch (e) {
      if (e.status == 404) return null;
      rethrow;
    }
  }

  Future<PointEarnPreview> previewPointEarn({
    required String programId,
    required String customerId,
    required int amountKurus,
    String? categoryId,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/points/customers/$customerId/preview',
      body: {
        'amountKurus': amountKurus,
        'categoryId': ?categoryId,
      },
    );
    return PointEarnPreview.fromJson(data);
  }

  Future<PointEarnResult> earnPoints({
    required String programId,
    required String customerId,
    required int amountKurus,
    String? categoryId,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/points/customers/$customerId/earn',
      body: {
        'amountKurus': amountKurus,
        'categoryId': ?categoryId,
        'confirmed': true,
      },
    );
    return PointEarnResult.fromJson(data);
  }

  Future<PointRedeemResult> pointRedeem({
    required String programId,
    required String customerId,
    required int pointCost,
    required String rewardLabel,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/points/customers/$customerId/redeem',
      body: {
        'pointCost': pointCost,
        'rewardLabel': rewardLabel,
      },
    );
    return PointRedeemResult.fromJson(data);
  }

  Future<DiscountCustomerState?> discountCustomerState(
    String programId,
    String customerId,
  ) async {
    try {
      final data = await request(
        'GET',
        '/programs/$programId/discount/customers/$customerId',
      );
      return DiscountCustomerState.fromJson(data);
    } on ApiException catch (e) {
      if (e.status == 404) return null;
      rethrow;
    }
  }

  Future<DiscountVerifyResult> verifyDiscount({
    required String programId,
    required String customerId,
    String? categoryId,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/discount/customers/$customerId/verify',
      body: {'categoryId': ?categoryId},
    );
    return DiscountVerifyResult.fromJson(data);
  }

  Future<DiscountApplyResult> applyDiscount({
    required String programId,
    required String customerId,
    String? categoryId,
    int? amountKurus,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/discount/customers/$customerId/apply',
      body: {
        'categoryId': ?categoryId,
        'amountKurus': ?amountKurus,
        'source': 'cashier',
      },
    );
    return DiscountApplyResult.fromJson(data);
  }

  Future<DiscountVerifyResult> scanDiscount({
    required String code,
    required String programId,
    String? categoryId,
  }) async {
    final data = await request(
      'POST',
      '/stamps/scan-discount',
      body: {
        'code': code,
        'programId': programId,
        'categoryId': ?categoryId,
      },
    );
    return DiscountVerifyResult.fromJson(data);
  }

  Future<EventCustomerState?> eventCustomerState(
    String programId,
    String customerId,
  ) async {
    try {
      final data = await request(
        'GET',
        '/programs/$programId/event/customers/$customerId',
      );
      return EventCustomerState.fromJson(data);
    } on ApiException catch (e) {
      if (e.status == 404) return null;
      rethrow;
    }
  }

  Future<EventCheckInResult> eventCheckIn({
    required String programId,
    required String customerId,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/event/customers/$customerId/check-in',
      body: {'source': 'cashier'},
    );
    return EventCheckInResult.fromJson(data);
  }

  Future<MembershipState?> membershipState(
    String programId,
    String customerId,
  ) async {
    try {
      final data = await request(
        'GET',
        '/programs/$programId/membership/customers/$customerId',
      );
      return MembershipState.fromJson(data);
    } on ApiException catch (e) {
      if (e.status == 404) return null;
      rethrow;
    }
  }

  Future<MembershipActivateResult> activateMembership({
    required String programId,
    required String customerId,
    required String planId,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/membership/customers/$customerId/activate',
      body: {'planId': planId},
    );
    return MembershipActivateResult.fromJson(data);
  }

  Future<MembershipUseBenefitResult> useMembershipBenefit({
    required String programId,
    required String customerId,
    required String benefitLabel,
    String? note,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/membership/customers/$customerId/use-benefit',
      body: {
        'benefitLabel': benefitLabel,
        'note': ?note,
      },
    );
    return MembershipUseBenefitResult.fromJson(data);
  }

  Future<StaffState?> staffState(
    String programId,
    String customerId,
  ) async {
    try {
      final data = await request(
        'GET',
        '/programs/$programId/staff/customers/$customerId',
      );
      return StaffState.fromJson(data);
    } on ApiException catch (e) {
      if (e.status == 404) return null;
      rethrow;
    }
  }

  Future<void> enrollStaff({
    required String programId,
    required String customerId,
    String? inviteCode,
  }) async {
    await request(
      'POST',
      '/programs/$programId/staff/customers/$customerId/enroll',
      body: {'inviteCode': ?inviteCode},
    );
  }

  Future<StaffRedeemResult> redeemStaff({
    required String programId,
    required String customerId,
    required int amountKurus,
    String? managerPin,
    String? note,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/staff/customers/$customerId/redeem',
      body: {
        'amountKurus': amountKurus,
        'managerPin': ?managerPin,
        'note': ?note,
      },
    );
    return StaffRedeemResult.fromJson(data);
  }

  Future<CashbackCustomerState?> cashbackCustomerState(
    String programId,
    String customerId,
  ) async {
    try {
      final data = await request(
        'GET',
        '/programs/$programId/cashback/customers/$customerId',
      );
      return CashbackCustomerState.fromJson(data);
    } on ApiException catch (e) {
      if (e.status == 404) return null;
      rethrow;
    }
  }

  Future<CashbackEarnPreview> previewCashbackEarn({
    required String programId,
    required String customerId,
    required int amountKurus,
    String? categoryId,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/cashback/customers/$customerId/preview',
      body: {
        'amountKurus': amountKurus,
        'categoryId': ?categoryId,
      },
    );
    return CashbackEarnPreview.fromJson(data);
  }

  Future<CashbackEarnResult> earnCashback({
    required String programId,
    required String customerId,
    required int amountKurus,
    String? categoryId,
    bool confirmed = true,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/cashback/customers/$customerId/earn',
      body: {
        'amountKurus': amountKurus,
        'categoryId': ?categoryId,
        'confirmed': confirmed,
      },
    );
    return CashbackEarnResult.fromJson(data);
  }

  Future<CashbackRedeemResult> redeemCashbackCredit({
    required String programId,
    required String customerId,
    required int amountKurus,
    int? basketKurus,
  }) async {
    final data = await request(
      'POST',
      '/programs/$programId/cashback/customers/$customerId/redeem-credit',
      body: {
        'amountKurus': amountKurus,
        'basketKurus': ?basketKurus,
      },
    );
    return CashbackRedeemResult.fromJson(data);
  }

  Future<CashbackScanResult> scanCashbackEarn({
    required String code,
    required int amountKurus,
    bool confirmed = true,
    String? categoryId,
  }) async {
    final data = await request(
      'POST',
      '/stamps/scan-cashback',
      body: {
        'code': code,
        'amountKurus': amountKurus,
        'confirmed': confirmed,
        'categoryId': ?categoryId,
      },
    );
    return CashbackScanResult.fromJson(data);
  }
}
