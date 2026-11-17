import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../phone_utils.dart';
import '../../../theme.dart';
import '../../../widgets/ui.dart';

class CounterPhonePanel extends StatelessWidget {
  const CounterPhonePanel({
    super.key,
    required this.phoneController,
    required this.phoneFocus,
    required this.cashierMode,
    required this.phoneValid,
    required this.busy,
    required this.registering,
    required this.onSearch,
    required this.onRegister,
  });

  final TextEditingController phoneController;
  final FocusNode phoneFocus;
  final bool cashierMode;
  final bool phoneValid;
  final bool busy;
  final bool registering;
  final VoidCallback onSearch;
  final VoidCallback onRegister;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Müşteri bul',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 4),
        Text(
          'Telefon numarası ile ara veya yeni kayıt oluştur',
          style: TextStyle(color: c.muted, fontSize: 13),
        ),
        const SizedBox(height: 12),
        PremiumCard(
          padding: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                decoration: BoxDecoration(
                  color: c.surface,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(kRadius),
                  ),
                ),
                child: TextField(
                  focusNode: phoneFocus,
                  controller: phoneController,
                  keyboardType:
                      cashierMode ? TextInputType.number : TextInputType.phone,
                  inputFormatters: cashierMode
                      ? [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(11),
                        ]
                      : null,
                  onTapOutside: onTapOutsideDismissKeyboard,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                    letterSpacing: 0.3,
                  ),
                  decoration: InputDecoration(
                    labelText: 'Telefon numarası',
                    hintText: '5xx xxx xx xx',
                    prefixIcon: const Icon(Icons.phone_iphone_rounded),
                    errorText: phoneValidationHint(phoneController.text),
                    filled: true,
                    fillColor: c.panel,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(kRadiusSm),
                      borderSide: BorderSide(color: c.line),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(kRadiusSm),
                      borderSide: BorderSide(
                        color: phoneValid ? kBrand : c.line,
                        width: phoneValid ? 1.5 : 1,
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(kRadiusSm),
                      borderSide: const BorderSide(color: kBrand, width: 1.5),
                    ),
                  ),
                  onSubmitted: (_) {
                    if (phoneValid && !busy) onSearch();
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    FilledButton.icon(
                      onPressed: busy || !phoneValid ? null : onSearch,
                      icon: const Icon(Icons.search_rounded, size: 20),
                      label: const Text('Ara'),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: busy || !phoneValid ? null : onRegister,
                      icon: const Icon(Icons.person_add_outlined, size: 20),
                      label: Text(registering ? 'Kaydediliyor…' : 'Yeni kayıt'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: c.ink,
                        side: BorderSide(color: c.line),
                        backgroundColor: c.panel,
                      ),
                    ),
                    if (!phoneValid && phoneController.text.trim().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: Text(
                          'Ara ve kayıt için geçerli 10 haneli cep numarası girin',
                          style: TextStyle(
                            color: c.mutedLight.withValues(alpha: 0.95),
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
