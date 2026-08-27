import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/ui.dart';

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

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _search,
                decoration: const InputDecoration(
                  hintText: 'Telefon ile filtrele',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
                onSubmitted: (_) => _load(),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [
                  ChoiceChip(
                    label: const Text('Tümü'),
                    selected: _filter == 'all',
                    onSelected: (_) {
                      setState(() => _filter = 'all');
                      _load();
                    },
                  ),
                  ChoiceChip(
                    label: const Text('Ödül hazır'),
                    selected: _filter == 'ready',
                    onSelected: (_) {
                      setState(() => _filter = 'ready');
                      _load();
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: kAccent))
              : _error != null
                  ? EmptyState(title: _error!)
                  : RefreshIndicator(
                      color: kAccent,
                      onRefresh: _load,
                      child: _data!.customers.isEmpty
                          ? ListView(
                              children: const [
                                SizedBox(height: 80),
                                EmptyState(
                                  title: 'Müşteri bulunamadı',
                                  subtitle: 'Tezgâhtan yeni kayıt ekleyin',
                                ),
                              ],
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                              itemCount: _data!.customers.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 8),
                              itemBuilder: (context, i) {
                                final c = _data!.customers[i];
                                final req = _data!.stampsRequired;
                                return PremiumCard(
                                  padding: const EdgeInsets.all(16),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 48,
                                        height: 48,
                                        alignment: Alignment.center,
                                        decoration: BoxDecoration(
                                          color: c.rewardReady
                                              ? const Color(0xFFD8F3DC)
                                              : kAccentMist,
                                          borderRadius: BorderRadius.circular(14),
                                        ),
                                        child: Text(
                                          '${c.stampCount}',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w800,
                                            color: c.rewardReady ? kAccent : kInk,
                                            fontSize: 16,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              formatPhone(c.phone),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                                fontSize: 16,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${c.stampCount}/$req · ${c.ledgerCount ?? 0} işlem'
                                              '${c.updatedAt != null ? ' · ${shortDate(c.updatedAt)}' : ''}',
                                              style: const TextStyle(
                                                color: kMuted,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (c.rewardReady)
                                        const StatusPill(
                                          label: 'Hazır',
                                          tone: PillTone.success,
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
