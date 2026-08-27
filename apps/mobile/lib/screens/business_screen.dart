import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/invite_qr_sheet.dart';
import '../widgets/ui.dart';

class BusinessScreen extends StatefulWidget {
  const BusinessScreen({super.key});

  @override
  State<BusinessScreen> createState() => _BusinessScreenState();
}

class _BusinessScreenState extends State<BusinessScreen> {
  final _name = TextEditingController();
  final _headline = TextEditingController();
  final _subtitle = TextEditingController();
  TenantProfile? _tenant;
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _ok;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _name.dispose();
    _headline.dispose();
    _subtitle.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final t = await context.read<AuthState>().api.tenantMe();
      _name.text = t.name;
      _headline.text = t.inviteHeadline ?? '';
      _subtitle.text = t.inviteSubtitle ?? '';
      if (mounted) setState(() => _tenant = t);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
      _ok = null;
    });
    try {
      await context.read<AuthState>().api.patchTenant({
        'name': _name.text.trim(),
        'inviteHeadline': _headline.text.trim(),
        'inviteSubtitle': _subtitle.text.trim(),
      });
      if (mounted) setState(() => _ok = 'Kaydedildi');
      await _load();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _copyInvite() async {
    try {
      final link = await context.read<AuthState>().api.invitePreviewLink();
      await Clipboard.setData(ClipboardData(text: link));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Davet linki kopyalandı')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _openPreview() async {
    try {
      final link = await context.read<AuthState>().api.invitePreviewLink();
      final uri = Uri.parse(link);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _showQr() async {
    try {
      final link = await context.read<AuthState>().api.invitePreviewLink();
      if (mounted) {
        await showInviteQrSheet(
          context,
          url: link,
          phoneLabel: _tenant?.name,
        );
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_error!, style: const TextStyle(color: Colors.red)),
          ),
        if (_ok != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_ok!, style: const TextStyle(color: kAccent)),
          ),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'İşletme adı'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _headline,
                decoration: const InputDecoration(labelText: 'Davet başlığı'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _subtitle,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Alt başlık / karşılama'),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: _saving ? null : _save,
                child: Text(_saving ? 'Kaydediliyor…' : 'Kaydet'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _copyInvite,
                child: const Text('Link kopyala'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton(
                onPressed: _openPreview,
                child: const Text('Önizle'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: _showQr,
          icon: const Icon(Icons.qr_code_2_rounded),
          label: const Text('Genel davet QR'),
        ),
        if (_tenant != null) ...[
          const SizedBox(height: 12),
          PremiumCard(
            child: Text(
              'Kalıcı davet adresi: dokunkazan.com/${_tenant!.slug}',
              style: const TextStyle(color: kMuted, height: 1.45),
            ),
          ),
        ],
      ],
    );
  }
}
