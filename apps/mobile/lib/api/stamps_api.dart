import '../models.dart';
import 'api_client.dart';

extension StampsApi on ApiClient {
  Future<List<Customer>> findCustomers(String phone) async {
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    final list = await requestList(
      '/stamps/customers?phone=${Uri.encodeQueryComponent(digits)}',
    );
    return list
        .map((e) => Customer.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<StampResult> registerCustomer(
    String phone, {
    List<String>? programIds,
  }) async {
    final data = await request('POST', '/stamps/customers', body: {
      'phone': phone,
      if (programIds != null && programIds.isNotEmpty)
        'programIds': programIds,
    });
    return StampResult.fromJson(data);
  }

  Future<StampResult> addStamp(
    String customerId, {
    String? productGroupId,
  }) async {
    return addStampWithGroup(customerId, productGroupId: productGroupId);
  }

  Future<StampResult> addStampWithGroup(
    String customerId, {
    String? productGroupId,
  }) async {
    final body = <String, dynamic>{'source': 'cashier'};
    if (productGroupId != null) body['productGroupId'] = productGroupId;
    final data = await request(
      'POST',
      '/stamps/customers/$customerId/stamp',
      body: body,
    );
    return StampResult.fromJson(data);
  }

  Future<StampResult> stampByScan(String code) async {
    final data = await request(
      'POST',
      '/stamps/scan',
      body: {'code': code},
    );
    return StampResult.fromJson(data);
  }

  Future<({Customer customer, String redeemed})> redeem(
    String customerId, {
    String? tierId,
  }) async {
    final body = tierId != null ? {'tierId': tierId} : null;
    final data = await request(
      'POST',
      '/stamps/customers/$customerId/redeem',
      body: body,
    );
    return (
      customer: Customer.fromJson(data['customer'] as Map<String, dynamic>),
      redeemed: data['redeemed'] as String? ?? '',
    );
  }

  Future<DaySummary> daySummary() async {
    final data = await request('GET', '/stamps/summary/today');
    return DaySummary.fromJson(data);
  }

  Future<String> walletInviteLink(String customerId) async {
    final data = await request(
      'GET',
      '/stamps/customers/$customerId/wallet-invite',
    );
    return data['walletInviteUrl'] as String;
  }

  Future<String> walletInviteWithPrograms(
    String customerId, {
    List<String>? programIds,
  }) async {
    final data = await request(
      'POST',
      '/stamps/customers/$customerId/wallet-invite',
      body: programIds != null && programIds.isNotEmpty
          ? {'programIds': programIds}
          : {},
    );
    return data['walletInviteUrl'] as String;
  }

  Future<CustomerDirectory> customerDirectory({
    String? q,
    String filter = 'all',
  }) async {
    final params = <String, String>{
      'filter': filter,
      'take': '80',
      if (q != null && q.isNotEmpty) 'q': q,
    };
    final qs = params.entries
        .map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}')
        .join('&');
    final data = await request('GET', '/stamps/customers/directory?$qs');
    return CustomerDirectory.fromJson(data);
  }
}
