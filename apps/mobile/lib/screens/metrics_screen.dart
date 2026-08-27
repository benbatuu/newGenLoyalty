import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/ui.dart';
import 'customers_screen.dart';
import 'program_screen.dart';
import 'reports_screen.dart';

class MetricsScreen extends StatefulWidget {
  const MetricsScreen({super.key});

  @override
  State<MetricsScreen> createState() => _MetricsScreenState();
}

class _MetricsScreenState extends State<MetricsScreen> {
  OwnerMetrics? _data;
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
      final data = await context.read<AuthState>().api.ownerMetrics();
      if (mounted) setState(() => _data = data);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _open(Widget screen, String title) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          appBar: AppBar(title: Text(title)),
          body: screen,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _data == null) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }
    if (_error != null && _data == null) {
      return EmptyState(title: _error!);
    }
    final m = _data!;

    return RefreshIndicator(
      color: kAccent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          if (m.rewardLabel != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Text(
                '${m.stampsRequired} damga → ${m.rewardLabel}',
                style: const TextStyle(color: kMuted, height: 1.4),
              ),
            ),
          GradientHero(
            title: '${m.stampsToday} damga bugün',
            subtitle:
                '${m.redeemsToday} ödül · ${m.rewardReadyCount} müşteri ödül hazır',
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: MetricTile(
                  label: 'Müşteri',
                  value: '${m.totalCustomers}',
                  hint: '${m.activeCustomers} aktif',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: MetricTile(
                  label: 'Wallet cihaz',
                  value: '${m.registeredDevices}',
                  hint: '${m.applePassCount} Apple pass',
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: MetricTile(
                  label: 'Bu ay damga',
                  value: '${m.stampsMonth}',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: MetricTile(
                  label: 'Kasiyer',
                  value: '${m.staffCount}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          WeekChart(days: m.last7Days),
          const SizedBox(height: 22),
          const SectionLabel('Hızlı erişim'),
          const SizedBox(height: 10),
          HubTile(
            icon: Icons.insights_outlined,
            title: 'Raporlar',
            subtitle: 'Hareket geçmişi ve özet',
            onTap: () => _open(const ReportsScreen(), 'Raporlar'),
          ),
          const SizedBox(height: 8),
          HubTile(
            icon: Icons.groups_outlined,
            title: 'Müşteriler',
            subtitle: 'Liste ve arama',
            onTap: () => _open(const CustomersScreen(), 'Müşteriler'),
            tone: kAccentSoft,
          ),
          const SizedBox(height: 8),
          HubTile(
            icon: Icons.tune_rounded,
            title: 'Program yönetimi',
            subtitle: 'Ödül, bildirim, ekip, abonelik',
            onTap: () => _open(const ProgramScreen(), 'Program'),
            tone: kGold,
          ),
        ],
      ),
    );
  }
}
