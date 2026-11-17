import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/ui.dart';
import 'customer_detail_screen.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  final _search = TextEditingController();
  CustomerDirectory? _data;
  String _filter = 'all';
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _search.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await context.read<AuthState>().api.customerDirectory(
            q: _search.text.trim().isEmpty ? null : _search.text.trim(),
            filter: _filter,
          );
      if (mounted) setState(() => _data = data);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openDetail(Customer customer) {
    if (_data == null) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CustomerDetailScreen(
          customer: customer,
          stampsRequired: _data!.stampsRequired,
          rewardLabel: _data!.rewardLabel,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                decoration: BoxDecoration(
                  color: c.panel,
                  borderRadius: BorderRadius.circular(kRadius),
                  border: Border.all(color: c.lineSoft),
                ),
                child: TextField(
                  controller: _search,
                  onTapOutside: onTapOutsideDismissKeyboard,
                  decoration: InputDecoration(
                    hintText: 'Telefon veya isim ara',
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: _search.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close_rounded, size: 20),
                            onPressed: () {
                              _search.clear();
                              _load();
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                  ),
                  onSubmitted: (_) => _load(),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        _FilterPill(
                          label: 'Tümü',
                          selected: _filter == 'all',
                          onTap: () {
                            setState(() => _filter = 'all');
                            _load();
                          },
                        ),
                        _FilterPill(
                          label: 'Ödül hazır',
                          selected: _filter == 'ready',
                          onTap: () {
                            setState(() => _filter = 'ready');
                            _load();
                          },
                        ),
                      ],
                    ),
                  ),
                  if (_data != null) ...[
                    const SizedBox(width: 8),
                    Text(
                      '${_data!.customers.length} müşteri',
                      style: GoogleFonts.dmSans(
                        fontSize: 12,
                        color: c.muted,
                        fontWeight: FontWeight.w500,
                        height: 1,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? Center(child: CircularProgressIndicator(color: c.accent))
              : _error != null
                  ? EmptyState(title: _error!)
                  : RefreshIndicator(
                      color: c.accent,
                      onRefresh: _load,
                      child: _data!.customers.isEmpty
                          ? ListView(
                              children: const [
                                SizedBox(height: 80),
                                EmptyState(
                                  title: 'Müşteri bulunamadı',
                                  subtitle:
                                      'Henüz kayıt yok veya arama kriterinize uygun sonuç yok',
                                ),
                              ],
                            )
                          : ListView.separated(
                              padding:
                                  const EdgeInsets.fromLTRB(20, 16, 20, 32),
                              itemCount: _data!.customers.length,
                              separatorBuilder: (_, _) =>
                                  const SizedBox(height: 8),
                              itemBuilder: (context, i) {
                                final customer = _data!.customers[i];
                                final req = _data!.stampsRequired;
                                final progress =
                                    (customer.stampCount / req).clamp(0.0, 1.0);
                                return PremiumCard(
                                  padding: const EdgeInsets.all(14),
                                  onTap: () => _openDetail(customer),
                                  child: Row(
                                    children: [
                                      _CustomerAvatar(
                                        customer: customer,
                                        progress: progress,
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              customer.displayName?.isNotEmpty == true
                                                  ? customer.displayName!
                                                  : formatPhone(customer.phone),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                                fontSize: 15,
                                              ),
                                            ),
                                            const SizedBox(height: 3),
                                            Text(
                                              customer.displayName?.isNotEmpty == true
                                                  ? formatPhone(customer.phone)
                                                  : '${customer.stampCount}/$req damga · ${customer.ledgerCount ?? 0} işlem',
                                              style: TextStyle(
                                                color: c.muted,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.end,
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Wrap(
                                            spacing: 4,
                                            runSpacing: 4,
                                            alignment: WrapAlignment.end,
                                            children: [
                                              if (customer.rewardReady)
                                                const StatusPill(
                                                  label: 'Hazır',
                                                  tone: PillTone.success,
                                                ),
                                              if (customer.hasWallet)
                                                const StatusPill(
                                                  label: 'Wallet',
                                                  tone: PillTone.brand,
                                                ),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          Icon(
                                            Icons.arrow_forward_ios_rounded,
                                            size: 14,
                                            color: c.mutedLight
                                                .withValues(alpha: 0.8),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
        ),
      ],
    );
  }
}

class _FilterPill extends StatelessWidget {
  const _FilterPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? c.accent : c.surface,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? c.accent : c.line,
            ),
          ),
          child: Text(
            label,
            style: GoogleFonts.dmSans(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: selected ? c.accentForeground : c.muted,
            ),
          ),
        ),
      ),
    );
  }
}

class _CustomerAvatar extends StatelessWidget {
  const _CustomerAvatar({
    required this.customer,
    required this.progress,
  });

  final Customer customer;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final label = customer.displayName?.isNotEmpty == true
        ? customer.displayName![0].toUpperCase()
        : customer.phone.length >= 2
            ? customer.phone.substring(customer.phone.length - 2)
            : '?';

    return SizedBox(
      width: 50,
      height: 50,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              value: progress > 0 ? progress : null,
              strokeWidth: 3,
              backgroundColor: c.surface,
              color: customer.rewardReady ? kSuccess : kBrand,
            ),
          ),
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: customer.rewardReady ? c.successSoft : c.brandMist,
              shape: BoxShape.circle,
            ),
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 13,
                color: customer.rewardReady ? kSuccess : kBrand,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
