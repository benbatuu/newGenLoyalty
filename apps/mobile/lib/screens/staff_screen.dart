import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class StaffScreen extends StatefulWidget {
  const StaffScreen({super.key});

  @override
  State<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends State<StaffScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController(text: 'Password123!');
  List<StaffMember> _staff = [];
  bool _loading = true;
  bool _inviting = false;
  String? _busyId;
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
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await context.read<AuthState>().api.staff();
      if (mounted) setState(() => _staff = list);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _invite() async {
    final name = _name.text.trim();
    final email = _email.text.trim();
    final password = _password.text.trim();
    if (name.length < 2) {
      setState(() => _error = 'İsim en az 2 karakter olmalı');
      return;
    }
    if (!email.contains('@')) {
      setState(() => _error = 'Geçerli e-posta girin');
      return;
    }
    if (password.length < 8) {
      setState(() => _error = 'Şifre en az 8 karakter olmalı');
      return;
    }
    setState(() {
      _inviting = true;
      _error = null;
      _ok = null;
    });
    try {
      await context.read<AuthState>().api.inviteStaff(
            name: name,
            email: email,
            password: password,
          );
      if (mounted) {
        setState(() {
          _ok = 'Kasiyer eklendi';
          _name.clear();
          _email.clear();
        });
      }
      await _load();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _inviting = false);
    }
  }

  Future<void> _resetLink(String userId) async {
    setState(() => _busyId = userId);
    try {
      final link = await context.read<AuthState>().api.staffResetLink(userId);
      await Clipboard.setData(ClipboardData(text: link));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Şifre sıfırlama linki kopyalandı')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: kAccent,
      onRefresh: _load,
      child: ListView(
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
                  decoration: const InputDecoration(labelText: 'Ad soyad'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'E-posta'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Geçici şifre (min 8)',
                  ),
                ),
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: _inviting ? null : _invite,
                  child: Text(_inviting ? 'Ekleniyor…' : 'Kasiyer ekle'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          const SectionLabel('Ekip'),
          const SizedBox(height: 8),
          if (_loading)
            const Center(child: CircularProgressIndicator(color: kAccent))
          else if (_staff.isEmpty)
            const EmptyState(title: 'Henüz kasiyer yok')
          else
            ..._staff.map((u) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: PremiumCard(
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: kAccentMist,
                        foregroundColor: kAccent,
                        child: Text(
                          u.name.isNotEmpty ? u.name[0].toUpperCase() : '?',
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              u.name,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            Text(
                              u.email,
                              style: const TextStyle(color: kMuted, fontSize: 13),
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
                      if (u.role == 'CASHIER') ...[
                        const SizedBox(width: 4),
                        IconButton(
                          tooltip: 'Sıfırlama linki',
                          onPressed: _busyId == u.id ? null : () => _resetLink(u.id),
                          icon: _busyId == u.id
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.link_rounded, size: 20),
                        ),
                      ],
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
