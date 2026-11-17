import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../push_service.dart';
import '../theme.dart';
import '../widgets/profile_ui.dart';
import '../widgets/theme_toggle.dart';
import '../widgets/ui.dart';
import 'billing_screen.dart';
import 'programs_hub_screen.dart';
import 'reports_screen.dart';
import 'staff_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  TenantProfile? _tenant;
  PushSettings? _push;
  bool _loading = true;
  bool _pushSaving = false;
  bool _actionBusy = false;
  String? _error;
  String? _pushError;

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
      final auth = context.read<AuthState>();
      final user = auth.user;
      if (user == null) return;

      final tenant = user.isOwner ? await auth.api.tenantMe() : null;
      PushSettings? push;
      if (user.isOwner) {
        try {
          push = await auth.api.pushSettings();
        } catch (_) {
          push = null;
        }
      }

      if (mounted) {
        setState(() {
          _tenant = tenant;
          _push = push;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _togglePush(bool value) async {
    final auth = context.read<AuthState>();
    setState(() {
      _pushSaving = true;
      _pushError = null;
    });
    try {
      await PushService.setEnabled(auth.api, auth.user, value);
      final push = await auth.api.pushSettings();
      if (mounted) setState(() => _push = push);
    } on ApiException catch (e) {
      if (mounted) setState(() => _pushError = e.message);
    } finally {
      if (mounted) setState(() => _pushSaving = false);
    }
  }

  void _open(BuildContext context, Widget screen, String title) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          appBar: AppBar(title: Text(title)),
          body: screen,
        ),
      ),
    );
  }

  Future<bool> _confirm({
    required String title,
    required String body,
    required String confirmLabel,
  }) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Vazgeç'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: kDanger),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return ok == true;
  }

  Future<void> _cancelSubscription() async {
    final ok = await _confirm(
      title: 'Aboneliği iptal et',
      body: 'Abonelik iptal edilir. Dönem sonuna kadar erişim devam edebilir. '
          'Bu işlem geri alınamaz.',
      confirmLabel: 'Aboneliği iptal et',
    );
    if (!ok || !mounted) return;
    setState(() => _actionBusy = true);
    try {
      await context.read<AuthState>().api.cancelSubscription();
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Abonelik iptal edildi')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _suspendAccount() async {
    final ok = await _confirm(
      title: 'Hesabı askıya al',
      body: 'Hesap geçici olarak kapatılır. Tezgâh ve panel erişimi durur. '
          'Yeniden açmak için destek ile iletişime geçin.',
      confirmLabel: 'Hesabı askıya al',
    );
    if (!ok || !mounted) return;
    setState(() => _actionBusy = true);
    try {
      await context.read<AuthState>().api.suspendAccount();
      if (mounted) {
        await context.read<AuthState>().logout();
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _confirmLogout() async {
    final ok = await _confirm(
      title: 'Çıkış yap',
      body: 'Bu cihazdaki oturum kapatılacak.',
      confirmLabel: 'Çıkış yap',
    );
    if (ok == true && mounted) {
      await context.read<AuthState>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user!;
    final roleLabel = switch (user.role) {
      'STORE_OWNER' => 'Kafe sahibi',
      'CASHIER' => 'Kasiyer',
      _ => user.role,
    };

    if (_loading) {
      return Center(
        child: CircularProgressIndicator(color: context.colors.accent),
      );
    }

    if (_error != null) {
      return EmptyState(title: _error!);
    }

    final tenant = _tenant;
    final brand = parseBrandColor(tenant?.primaryColor);
    final c = context.colors;

    return RefreshIndicator(
      color: c.accent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        children: [
          ProfileIdentityCard(
            name: user.name,
            email: user.email,
            roleLabel: roleLabel,
            tenantName: tenant?.name,
            tenantSlug: tenant?.slug,
            planLabel: tenant != null ? planCodeLabel(tenant.planCode) : null,
            logoUrl: tenant?.logoUrl,
            brandColor: brand,
          ),
          if (tenant != null) ...[
            const SizedBox(height: 14),
            Row(
              children: [
                ProfileStatChip(
                  label: 'Abonelik',
                  value: subscriptionStatusLabel(tenant.subscriptionStatus),
                ),
                const SizedBox(width: 8),
                ProfileStatChip(
                  label: 'Paket',
                  value: planCodeLabel(tenant.planCode),
                ),
                const SizedBox(width: 8),
                ProfileStatChip(
                  label: 'Kayıt',
                  value: tenant.createdAt != null
                      ? _formatDate(tenant.createdAt!)
                      : '—',
                ),
              ],
            ),
          ],
          const SizedBox(height: 22),
          ProfileSection(
            title: 'Görünüm',
            children: const [
              ThemePreferenceRow(),
            ],
          ),
          const SizedBox(height: 18),
          if (user.isOwner) ...[
            ProfileSection(
              title: 'İşletme ayarları',
              children: [
                ProfileMenuRow(
                  icon: Icons.receipt_long_outlined,
                  title: 'Abonelik ve fatura',
                  subtitle: tenant != null
                      ? '${planCodeLabel(tenant.planCode)} · ${subscriptionStatusLabel(tenant.subscriptionStatus)}'
                      : 'Paket durumu',
                  onTap: () => _open(context, const BillingScreen(), 'Abonelik'),
                ),
                ProfileMenuRow(
                  icon: Icons.view_module_outlined,
                  title: 'Program kartları',
                  subtitle: 'Aktif sadakat kartları',
                  onTap: () => _open(
                    context,
                    const ProgramsHubScreen(),
                    'Program kartları',
                  ),
                  iconTone: kBrand,
                ),
                ProfileMenuRow(
                  icon: Icons.badge_outlined,
                  title: 'Ekip',
                  subtitle: 'Kasiyer hesapları',
                  onTap: () => _open(context, const StaffScreen(), 'Ekip'),
                ),
                ProfileMenuRow(
                  icon: Icons.bar_chart_outlined,
                  title: 'Raporlar',
                  subtitle: 'Damga ve ödül özeti',
                  onTap: () => _open(context, const ReportsScreen(), 'Raporlar'),
                ),
              ],
            ),
            const SizedBox(height: 18),
            ProfileSection(
              title: 'Tercihler',
              children: [
                ProfileMenuRow(
                  icon: Icons.notifications_active_outlined,
                  title: 'Push bildirimleri',
                  subtitle: 'Günlük özet ve hesap güncellemeleri',
                  trailing: _pushSaving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Switch.adaptive(
                          value: _push?.enabled ?? true,
                          onChanged: _push == null ? null : _togglePush,
                          activeThumbColor: kBrand,
                        ),
                ),
                if (_pushError != null)
                  ProfileMenuRow(
                    icon: Icons.error_outline_rounded,
                    title: 'Bildirim hatası',
                    subtitle: _pushError,
                    iconTone: kDanger,
                  ),
              ],
            ),
            const SizedBox(height: 18),
            ProfileSection(
              title: 'Tehlikeli bölge',
              children: [
                ProfileMenuRow(
                  icon: Icons.cancel_outlined,
                  title: 'Aboneliği iptal et',
                  subtitle: tenant?.subscriptionStatus == 'CANCELLED'
                      ? 'Abonelik zaten iptal edilmiş'
                      : 'Dönem sonunda erişim sona erer',
                  iconTone: kDanger,
                  onTap: _actionBusy ||
                          tenant?.subscriptionStatus == 'CANCELLED'
                      ? null
                      : _cancelSubscription,
                ),
                ProfileMenuRow(
                  icon: Icons.pause_circle_outline_rounded,
                  title: 'Hesabı askıya al',
                  subtitle: 'Geçici kapatma — destek ile geri açılır',
                  iconTone: kDanger,
                  onTap: _actionBusy ? null : _suspendAccount,
                ),
              ],
            ),
            const SizedBox(height: 18),
          ],
          ProfileSection(
            title: 'Oturum',
            children: [
              ProfileMenuRow(
                icon: Icons.logout_rounded,
                title: 'Çıkış yap',
                subtitle: 'Bu cihazdaki oturumu kapat',
                iconTone: c.muted,
                onTap: _confirmLogout,
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final l = dt.toLocal();
    const months = [
      'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
      'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
    ];
    return '${l.day} ${months[l.month - 1]} ${l.year}';
  }
}
