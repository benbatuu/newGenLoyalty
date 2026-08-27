import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  ReportsPayload? _data;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await context.read<AuthState>().api.reports();
      if (mounted) setState(() => _data = data);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }
    if (_error != null) {
      return EmptyState(title: _error!);
    }
    final d = _data!;
    final t = d.totals;

    return RefreshIndicator(
      color: kAccent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Text('Raporlar', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(
            'Ödül: ${d.stampsRequired} damga → ${d.rewardLabel}',
            style: const TextStyle(color: kMuted),
          ),
          const SizedBox(height: 18),
          const SectionLabel('Özet'),
          const SizedBox(height: 10),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.3,
            children: [
              MetricTile(
                label: 'Bugün damga',
                value: '${t['stampsToday']}',
                accent: true,
              ),
              MetricTile(label: 'Bugün ödül', value: '${t['redeemsToday']}'),
              MetricTile(label: '7 gün damga', value: '${t['stampsWeek']}'),
              MetricTile(label: '7 gün ödül', value: '${t['redeemsWeek']}'),
              MetricTile(label: 'Bu ay damga', value: '${t['stampsMonth']}'),
              MetricTile(label: 'Bu ay ödül', value: '${t['redeemsMonth']}'),
              MetricTile(
                label: 'Toplam müşteri',
                value: '${t['totalCustomers']}',
              ),
              MetricTile(
                label: 'Yeni (7 gün)',
                value: '${t['newCustomersWeek']}',
              ),
            ],
          ),
          if (d.nearReward.isNotEmpty) ...[
            const SizedBox(height: 24),
            const SectionLabel('Ödüle yaklaşanlar'),
            const SizedBox(height: 10),
            ...d.nearReward.map(
              (c) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: PremiumCard(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          formatPhone(c.phone),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      Text(
                        '${c.stampCount} · ${c.remaining} kaldı',
                        style: const TextStyle(color: kMuted, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
          const SizedBox(height: 24),
          const SectionLabel('Son işlemler'),
          const SizedBox(height: 10),
          if (d.recentActivity.isEmpty)
            const PremiumCard(
              child: Text('Henüz işlem yok', style: TextStyle(color: kMuted)),
            )
          else
            ...d.recentActivity.map((a) {
              final isStamp = a.type == 'STAMP';
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: PremiumCard(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: isStamp ? kAccentMist : const Color(0xFFFFF1E0),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          isStamp
                              ? Icons.add_circle_outline_rounded
                              : Icons.card_giftcard_rounded,
                          size: 18,
                          color: isStamp ? kAccent : kGold,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isStamp ? 'Damga' : 'Ödül kullanıldı',
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                            Text(
                              '${formatPhone(a.phone)}'
                              '${a.byName != null ? ' · ${a.byName}' : ''}',
                              style: const TextStyle(color: kMuted, fontSize: 13),
                            ),
                            if (a.note != null && a.note!.isNotEmpty)
                              Text(
                                a.note!,
                                style: const TextStyle(fontSize: 12, color: kMuted),
                              ),
                          ],
                        ),
                      ),
                      Text(
                        shortDate(a.createdAt),
                        style: const TextStyle(fontSize: 11, color: kMuted),
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
