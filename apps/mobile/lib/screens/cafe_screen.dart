import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class CafeScreen extends StatefulWidget {
  const CafeScreen({super.key});

  @override
  State<CafeScreen> createState() => _CafeScreenState();
}

class _CafeScreenState extends State<CafeScreen> {
  TenantProfile? _tenant;
  List<StaffMember> _staff = [];
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
      final tenant = await api.tenantMe();
      final staff = await api.staff();
      if (mounted) {
        setState(() {
          _tenant = tenant;
          _staff = staff;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _parseColor(String? hex) {
    if (hex == null || hex.length < 7) return kAccent;
    try {
      return Color(int.parse(hex.replaceFirst('#', 'FF'), radix: 16));
    } catch (_) {
      return kAccent;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }
    if (_error != null || _tenant == null) {
      return EmptyState(title: _error ?? 'Kafe bilgisi alınamadı');
    }
    final t = _tenant!;
    final brand = _parseColor(t.primaryColor);

    return RefreshIndicator(
      color: kAccent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          PremiumCard(
            padding: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  height: 88,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [brand, brand.withValues(alpha: 0.75)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(16),
                    ),
                  ),
                  padding: const EdgeInsets.all(18),
                  alignment: Alignment.bottomLeft,
                  child: Text(
                    t.name,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: Colors.white,
                        ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _infoRow('Slug', '/${t.slug}'),
                      _infoRow('Paket', '${t.planCode} · ₺${t.planPriceTry}/ay'),
                      _infoRow('Abonelik', t.subscriptionStatus),
                      if (t.subscriptionActivatedAt != null)
                        _infoRow(
                          'Aktifleştirme',
                          shortDate(t.subscriptionActivatedAt),
                        ),
                      if (t.rewardRule != null)
                        _infoRow(
                          'Ödül kuralı',
                          '${t.rewardRule!.stampsRequired} damga → ${t.rewardRule!.rewardLabel}',
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          const SectionLabel('Ekip'),
          const SizedBox(height: 10),
          ..._staff.map(
            (u) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: PremiumCard(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: kAccentMist,
                      foregroundColor: kAccent,
                      child: Text(u.name.isNotEmpty ? u.name[0].toUpperCase() : '?'),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            u.name,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          Text(
                            u.email,
                            style: const TextStyle(color: kMuted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    StatusPill(
                      label: u.role == 'STORE_OWNER' ? 'Sahip' : 'Kasiyer',
                      tone: u.role == 'STORE_OWNER'
                          ? PillTone.success
                          : PillTone.neutral,
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Profil ve ödül kuralı düzenleme web panelinden yapılır.',
            style: TextStyle(color: kMuted, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: const TextStyle(color: kMuted, fontSize: 13)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}
