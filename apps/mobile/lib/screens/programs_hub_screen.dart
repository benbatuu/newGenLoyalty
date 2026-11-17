import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../program_helpers.dart';
import '../widgets/ui.dart';

class ProgramsHubScreen extends StatefulWidget {
  const ProgramsHubScreen({super.key});

  @override
  State<ProgramsHubScreen> createState() => _ProgramsHubScreenState();
}

class _ProgramsHubScreenState extends State<ProgramsHubScreen> {
  ProgramsHub? _hub;
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
      final hub = await context.read<AuthState>().api.programsHub();
      if (mounted) setState(() => _hub = hub);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (_loading) {
      return Center(child: CircularProgressIndicator(color: c.accent));
    }
    if (_error != null) {
      return EmptyState(title: _error!);
    }
    final programs = _hub?.programs ?? [];
    if (programs.isEmpty) {
      return const EmptyState(
        title: 'Henüz program yok',
        subtitle: 'Kart türlerini web admin panelinden oluşturun',
      );
    }

    return RefreshIndicator(
      color: c.accent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Text(
            'Aktif programlar',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'Tezgâh ekranında bu kart türleriyle işlem yapılır. '
            'Tasarım ve kurallar web panelinden düzenlenir.',
            style: TextStyle(color: c.muted, height: 1.45),
          ),
          const SizedBox(height: 18),
          ...programs.map((p) => _ProgramTile(program: p)),
          const SizedBox(height: 16),
          PremiumCard(
            child: Text(
              'Kart tasarımı, limitler ve yeni program ekleme: '
              'web admin → Ödül / Settings.',
              style: TextStyle(color: c.muted, height: 1.45, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgramTile extends StatelessWidget {
  const _ProgramTile({required this.program});

  final ProgramSummary program;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: PremiumCard(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.brandMist,
                borderRadius: BorderRadius.circular(kRadiusSm),
              ),
              child: Icon(
                _iconForType(program.type),
                size: 20,
                color: c.accent,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          program.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                          ),
                        ),
                      ),
                      if (program.isPrimary)
                        const StatusPill(
                          label: 'Ana',
                          tone: PillTone.brand,
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    programTypeLabel(program.type),
                    style: TextStyle(color: c.muted, fontSize: 12),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    programCardSummary(program),
                    style: TextStyle(color: c.ink, fontSize: 13),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'POINT_CARD':
        return Icons.stars_rounded;
      case 'CASHBACK_CARD':
        return Icons.savings_outlined;
      case 'DISCOUNT_CARD':
        return Icons.local_offer_outlined;
      case 'EVENT_CARD':
        return Icons.event_outlined;
      case 'MEMBERSHIP_CARD':
        return Icons.card_membership_outlined;
      case 'STAFF_CARD':
        return Icons.badge_outlined;
      case 'MULTI_STAMP':
        return Icons.layers_outlined;
      default:
        return Icons.loyalty_outlined;
    }
  }
}
