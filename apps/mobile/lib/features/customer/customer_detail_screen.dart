import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth_state.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../widgets/ui.dart';
import 'customer_detail_controller.dart';
import 'widgets/customer_hero.dart';
import 'widgets/detail_dividers.dart';
import 'widgets/detail_section.dart';
import 'widgets/empty_hint.dart';
import 'widgets/info_row.dart';
import 'widgets/notes_section.dart';
import 'widgets/program_row.dart';
import 'widgets/tags_section.dart';

class CustomerDetailScreen extends StatefulWidget {
  const CustomerDetailScreen({
    super.key,
    required this.customer,
    required this.stampsRequired,
    this.rewardLabel,
  });

  final Customer customer;
  final int stampsRequired;
  final String? rewardLabel;

  @override
  State<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen> {
  late final CustomerDetailController _controller;
  final _tagInput = TextEditingController();
  final _noteInput = TextEditingController();

  @override
  void initState() {
    super.initState();
    _controller = CustomerDetailController(
      api: context.read<AuthState>().api,
      customer: widget.customer,
      stampsRequired: widget.stampsRequired,
    );
    _load();
  }

  @override
  void dispose() {
    _tagInput.dispose();
    _noteInput.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    await _controller.load();
    if (mounted) setState(() {});
  }

  void _showError(String? message) {
    if (message != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    }
  }

  Future<void> _addTag() async {
    final err = await _controller.addTag(_tagInput.text);
    if (err == null) _tagInput.clear();
    _showError(err);
    if (mounted) setState(() {});
  }

  Future<void> _addNote() async {
    final err = await _controller.addNote(_noteInput.text);
    if (err == null) _noteInput.clear();
    _showError(err);
    if (mounted) setState(() {});
  }

  Future<void> _toggleSms() async {
    final err = await _controller.toggleSms();
    _showError(err);
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final customer = widget.customer;
    final progress =
        (customer.stampCount / widget.stampsRequired).clamp(0.0, 1.0);
    final ctrl = _controller;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: Text(
          customer.displayName?.isNotEmpty == true
              ? customer.displayName!
              : 'Müşteri',
        ),
      ),
      body: ctrl.loading
          ? Center(child: CircularProgressIndicator(color: c.accent))
          : ctrl.error != null
              ? EmptyState(title: ctrl.error!)
              : RefreshIndicator(
                  color: c.accent,
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
                    children: [
                      CustomerHero(
                        initials: ctrl.computeInitials(),
                        phone: formatPhone(customer.phone),
                        displayName: customer.displayName,
                        progress: progress,
                        stampCount: customer.stampCount,
                        stampsRequired: widget.stampsRequired,
                        rewardReady: customer.rewardReady,
                        hasWallet: customer.hasWallet,
                        ledgerCount: customer.ledgerCount ?? 0,
                      ),
                      const SizedBox(height: 16),
                      DetailSection(
                        title: 'Sadakat programları',
                        child: ctrl.programs.isEmpty
                            ? const CustomerEmptyHint(
                                icon: Icons.loyalty_outlined,
                                text: 'Henüz bir program kaydı bulunamadı',
                              )
                            : Column(
                                children: withDetailDividers(
                                  ctrl.programs
                                      .map(
                                        (p) => ProgramRow(
                                          name: p.programName,
                                          type: p.typeLabel,
                                          value: p.value,
                                          active: p.hasActivity,
                                        ),
                                      )
                                      .toList(),
                                ),
                              ),
                      ),
                      const SizedBox(height: 16),
                      DetailSection(
                        title: 'VIP & iletişim',
                        child: Column(
                          children: withDetailDividers([
                            CustomerInfoRow(
                              icon: Icons.workspace_premium_outlined,
                              iconColor: ctrl.vipTier != null ? kAmber : c.muted,
                              label: 'VIP seviyesi',
                              value: ctrl.vipTier ?? 'Atanmamış',
                              muted: ctrl.vipTier == null,
                            ),
                            CustomerInfoRow(
                              icon: Icons.sms_outlined,
                              iconColor: kBrand,
                              label: 'Ticari SMS',
                              value: ctrl.smsOptOut ? 'Kapalı' : 'Açık',
                              subtitle: ctrl.smsOptOut
                                  ? 'Kampanya SMS gönderilmez'
                                  : 'Kampanya SMS gönderilebilir',
                              trailing: Switch.adaptive(
                                value: !ctrl.smsOptOut,
                                onChanged: ctrl.busy ? null : (_) => _toggleSms(),
                                activeThumbColor: kBrand,
                              ),
                            ),
                          ]),
                        ),
                      ),
                      const SizedBox(height: 16),
                      DetailSection(
                        title: 'Etiketler',
                        child: CustomerTagsSection(
                          controller: ctrl,
                          tagInput: _tagInput,
                          onAdd: _addTag,
                        ),
                      ),
                      const SizedBox(height: 16),
                      DetailSection(
                        title: 'Notlar',
                        child: CustomerNotesSection(
                          controller: ctrl,
                          noteInput: _noteInput,
                          onAdd: _addNote,
                        ),
                      ),
                      const SizedBox(height: 16),
                      DetailSection(
                        title: 'Kayıt bilgileri',
                        child: Column(
                          children: withDetailDividers([
                            CustomerInfoRow(
                              icon: Icons.calendar_today_outlined,
                              iconColor: kTeal,
                              label: 'Kayıt tarihi',
                              value: formatDateTr(
                                customer.createdAt,
                                withTime: true,
                              ),
                            ),
                            CustomerInfoRow(
                              icon: Icons.update_outlined,
                              iconColor: kTeal,
                              label: 'Son işlem',
                              value: customer.updatedAt != null
                                  ? formatDateTr(
                                      customer.updatedAt,
                                      withTime: true,
                                    )
                                  : 'Henüz işlem yok',
                              muted: customer.updatedAt == null,
                            ),
                            CustomerInfoRow(
                              icon: Icons.verified_outlined,
                              iconColor: kSuccess,
                              label: 'KVKK onayı',
                              value: customer.consentAt != null
                                  ? formatDateTr(
                                      customer.consentAt,
                                      withTime: true,
                                    )
                                  : 'Henüz onay kaydı yok',
                              muted: customer.consentAt == null,
                            ),
                            if (customer.birthMonth != null &&
                                customer.birthDay != null)
                              CustomerInfoRow(
                                icon: Icons.cake_outlined,
                                iconColor: kAmber,
                                label: 'Doğum günü',
                                value: formatBirthday(
                                  customer.birthMonth,
                                  customer.birthDay,
                                ),
                              ),
                          ]),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}
