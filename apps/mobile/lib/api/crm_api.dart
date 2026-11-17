import '../models.dart';
import 'api_client.dart';

extension CrmApi on ApiClient {
  Future<String?> customerVipTier(String customerId) async {
    try {
      final data = await request('GET', '/vip/customers/$customerId');
      final tier = data['vipTier'] as Map<String, dynamic>?;
      return tier?['name'] as String?;
    } on ApiException {
      return null;
    }
  }

  Future<List<String>> customerTags(String customerId) async {
    try {
      final list = await requestList('/crm/customers/$customerId/tags');
      return list.map((e) => e as String).toList();
    } on ApiException {
      return [];
    }
  }

  Future<List<CustomerNote>> customerNotes(String customerId) async {
    try {
      final list = await requestList('/crm/customers/$customerId/notes');
      return list
          .map((e) => CustomerNote.fromJson(e as Map<String, dynamic>))
          .toList();
    } on ApiException {
      return [];
    }
  }

  Future<bool> customerSmsOptOut(String customerId) async {
    try {
      final data =
          await request('GET', '/crm/customers/$customerId/sms-opt-out');
      return data['smsOptOut'] as bool? ?? false;
    } on ApiException {
      return false;
    }
  }

  Future<void> addCustomerTag(String customerId, String tag) async {
    await request('POST', '/crm/customers/$customerId/tags', body: {'tag': tag});
  }

  Future<CustomerNote> addCustomerNote(String customerId, String body) async {
    final data = await request('POST', '/crm/customers/$customerId/notes', body: {
      'body': body,
    });
    return CustomerNote.fromJson(data);
  }

  Future<void> setCustomerSmsOptOut(String customerId, bool optOut) async {
    await request('PATCH', '/crm/customers/$customerId/sms-opt-out', body: {
      'optOut': optOut,
    });
  }
}
