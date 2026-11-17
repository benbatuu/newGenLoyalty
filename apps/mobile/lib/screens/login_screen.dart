import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../auth_state.dart';
import '../theme.dart';
import '../widgets/theme_toggle.dart';
import '../widgets/ui.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late final TextEditingController _email;
  late final TextEditingController _password;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _email = TextEditingController(
      text: kDebugMode ? 'cashier@demo-kafe.local' : '',
    );
    _password = TextEditingController(
      text: kDebugMode ? 'Password123!' : '',
    );
  }

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
        SnackBar(content: Text(err)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      body: AuthBackground(
        child: SafeArea(
          child: Stack(
            children: [
              const Positioned(
                top: 8,
                right: 8,
                child: ThemePreferenceMenu(),
              ),
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'StampWell - Loyalty Platform',
                          style: GoogleFonts.dmSans(
                            color: c.ink,
                            height: 1.45,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Müşteri kartı Wallet\'ta yaşar — tezgâh ve özet burada.',
                          style: GoogleFonts.dmSans(
                            color: c.muted,
                            height: 1.45,
                            fontSize: 13,
                          ),
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
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
