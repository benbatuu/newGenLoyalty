import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth_state.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController(text: 'cashier@demo-kafe.local');
  final _password = TextEditingController(text: 'Password123!');
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    final ok = await context.read<AuthState>().login(
          _email.text,
          _password.text,
        );
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      final err = context.read<AuthState>().error ?? 'Giriş başarısız';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err),
          behavior: SnackBarBehavior.floating,
          backgroundColor: kAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFE8EEEA), Color(0xFFF3F6F4), Color(0xFFDDE6E0)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 24),
                    Text(
                      'Dokun & Kazan',
                      style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                            color: kAccent,
                          ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Personel uygulaması — müşteri kartı Wallet’ta yaşar.',
                      style: TextStyle(color: kMuted, height: 1.4),
                    ),
                    const SizedBox(height: 28),
                    PremiumCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextField(
                            controller: _email,
                            keyboardType: TextInputType.emailAddress,
                            autocorrect: false,
                            decoration: const InputDecoration(
                              labelText: 'E-posta',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _password,
                            obscureText: true,
                            decoration: const InputDecoration(
                              labelText: 'Şifre',
                            ),
                            onSubmitted: (_) => _busy ? null : _submit(),
                          ),
                          const SizedBox(height: 20),
                          FilledButton(
                            onPressed: _busy ? null : _submit,
                            child: Text(_busy ? 'Giriş…' : 'Giriş yap'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Demo: cashier@demo-kafe.local · owner@demo-kafe.local\nŞifre: Password123!',
                      style: TextStyle(color: kMuted, fontSize: 12, height: 1.45),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
