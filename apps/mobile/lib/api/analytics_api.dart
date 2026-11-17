import '../models.dart';
import 'api_client.dart';

extension AnalyticsApi on ApiClient {
  Future<ReportsPayload> reports({String? from, String? to}) async {
    final params = <String, String>{
      if (from != null && from.isNotEmpty) 'from': from,
      if (to != null && to.isNotEmpty) 'to': to,
    };
    final qs = params.entries
        .map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}')
        .join('&');
    final path = qs.isEmpty ? '/stamps/reports' : '/stamps/reports?$qs';
    final data = await request('GET', path);
    return ReportsPayload.fromJson(data);
  }

  Future<AnalyticsSummary> analyticsSummary({int days = 30}) async {
    final data = await request('GET', '/analytics/summary?days=$days');
    return AnalyticsSummary.fromJson(data);
  }

  Future<CashbackLiability> analyticsCashback() async {
    final data = await request('GET', '/analytics/cashback');
    return CashbackLiability.fromJson(data);
  }
}
