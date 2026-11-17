import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../program_helpers.dart';
import 'ui.dart';

/// Raporlar içeriği — Özet sekmesinde ve ayrı sayfada kullanılır.
class ReportsView extends StatefulWidget {
  const ReportsView({super.key, this.showTitle = false});

  final bool showTitle;

  @override
  State<ReportsView> createState() => _ReportsViewState();
}

class _ReportsViewState extends State<ReportsView> {
  static const _nearRewardLimit = 8;
  static const _recentActivityLimit = 12;

  ReportsPayload? _data;
  AnalyticsSummary? _analytics;
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
      final api = context.read<AuthState>().api;
      final results = await Future.wait([
        api.reports(),
        api.analyticsSummary(days: 30),
      ]);
      if (mounted) {
        setState(() {
          _data = results[0] as ReportsPayload;
          _analytics = results[1] as AnalyticsSummary;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (_loading && _data == null) {
      return Center(child: CircularProgressIndicator(color: c.accent));
    }
    if (_error != null && _data == null) {
      return EmptyState(title: _error!);
    }
    final d = _data!;
    final t = d.totals;
    final analytics = _analytics;

    return RefreshIndicator(
      color: c.accent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          if (widget.showTitle) ...[
            Text('Raporlar', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 4),
          ],
          Text(
            d.period != null
                ? 'Son 7 gün: ${d.period!.stamps} damga · ${d.period!.redeems} ödül · ${d.period!.newCustomers} yeni müşteri'
                : 'Ödül kuralı: ${d.stampsRequired} damga → ${d.rewardLabel}',
            style: TextStyle(color: c.muted, height: 1.4),
          ),
          const SizedBox(height: 16),
          _ReportsHero(
            stampsToday: t['stampsToday'] ?? 0,
            redeemsToday: t['redeemsToday'] ?? 0,
            totalCustomers: t['totalCustomers'] ?? 0,
          ),
          const SizedBox(height: 14),
          const SectionLabel('Dönem özeti'),
          const SizedBox(height: 10),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.35,
            children: [
              MetricTile(
                label: '7 gün damga',
                value: '${t['stampsWeek'] ?? 0}',
                accent: true,
              ),
              MetricTile(label: '7 gün ödül', value: '${t['redeemsWeek'] ?? 0}'),
              MetricTile(
                label: 'Bu ay damga',
                value: '${t['stampsMonth'] ?? 0}',
              ),
              MetricTile(
                label: 'Bu ay ödül',
                value: '${t['redeemsMonth'] ?? 0}',
              ),
              MetricTile(
                label: 'Yeni müşteri',
                value: '${t['newCustomersWeek'] ?? 0}',
                hint: 'son 7 gün',
              ),
              MetricTile(
                label: 'Ödül hazır',
                value: '${t['rewardReadyCount'] ?? 0}',
              ),
            ],
          ),
          if (analytics != null) ...[
            const SizedBox(height: 20),
            const SectionLabel('Metrikler (30 gün)'),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: MetricTile(
                    label: 'Puan işlemi',
                    value: '${analytics.totals.pointEarned}',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: MetricTile(
                    label: 'Cashback kazanım',
                    value: formatKurusTry(analytics.totals.cashbackEarnKurus),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 20),
          const SectionLabel('Program türüne göre'),
          const SizedBox(height: 10),
          if (d.byProgramType.where((r) => r.events > 0).isEmpty)
            _EmptyReportCard(
              message: 'Henüz program türüne göre kayıt bulunamadı',
            )
          else
            ...d.byProgramType.where((r) => r.events > 0).map(
                  (row) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: PremiumCard(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  row.label,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  breakdownSummary(row),
                                  style: TextStyle(
                                    color: c.muted,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '${row.events}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 18,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
          const SizedBox(height: 20),
          const SectionLabel('Ödüle yaklaşanlar'),
          const SizedBox(height: 10),
          if (d.nearReward.isEmpty)
            _EmptyReportCard(
              message: 'Henüz ödüle yaklaşan müşteri yok',
            )
          else ...[
            ...d.nearReward.take(_nearRewardLimit).map(
              (customer) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: PremiumCard(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          formatPhone(customer.phone),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      Text(
                        '${customer.stampCount} · ${customer.remaining} kaldı',
                        style: TextStyle(color: c.muted, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (d.nearReward.length > _nearRewardLimit)
              Padding(
                padding: const EdgeInsets.only(top: 4, bottom: 8),
                child: Text(
                  '+ ${d.nearReward.length - _nearRewardLimit} müşteri daha',
                  style: TextStyle(color: c.mutedLight, fontSize: 12),
                ),
              ),
          ],
          const SizedBox(height: 20),
          const SectionLabel('Son işlemler'),
          const SizedBox(height: 10),
          if (d.recentActivity.isEmpty)
            _EmptyReportCard(message: 'Henüz işlem kaydı yok')
          else ...[
            ...d.recentActivity.take(_recentActivityLimit).map((a) {
              final color = activityTypeColor(context, a.type);
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
                          color: color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          activityTypeIcon(a.type),
                          size: 18,
                          color: color,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              activityTypeLabel(a.type),
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                            Text(
                              '${formatPhone(a.phone)}'
                              '${a.byName != null ? ' · ${a.byName}' : ''}',
                              style: TextStyle(color: c.muted, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        shortDate(a.createdAt),
                        style: TextStyle(fontSize: 11, color: c.muted),
                      ),
                    ],
                  ),
                ),
              );
            }),
            if (d.recentActivity.length > _recentActivityLimit)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  '+ ${d.recentActivity.length - _recentActivityLimit} işlem daha',
                  style: TextStyle(color: c.mutedLight, fontSize: 12),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _ReportsHero extends StatelessWidget {
  const _ReportsHero({
    required this.stampsToday,
    required this.redeemsToday,
    required this.totalCustomers,
  });

  final int stampsToday;
  final int redeemsToday;
  final int totalCustomers;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [c.heroStart, c.heroEnd],
        ),
        borderRadius: BorderRadius.circular(kRadiusLg),
        boxShadow: [
          BoxShadow(
            color: c.heroShadow,
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$stampsToday',
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        color: Colors.white,
                        fontSize: 36,
                      ),
                ),
                const Text(
                  'damga bugün',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ),
          _heroStat('Ödül', '$redeemsToday'),
          const SizedBox(width: 16),
          _heroStat('Müşteri', '$totalCustomers'),
        ],
      ),
    );
  }

  Widget _heroStat(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
      ],
    );
  }
}

class _EmptyReportCard extends StatelessWidget {
  const _EmptyReportCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return PremiumCard(
      child: Row(
        children: [
          Icon(Icons.inbox_outlined, color: c.mutedLight.withValues(alpha: 0.7)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(message, style: TextStyle(color: c.muted)),
          ),
        ],
      ),
    );
  }
}
