import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme.dart';

/// Tam ekran yükleme — etkileşimi engeller.
class BlockingLoadingOverlay extends StatelessWidget {
  const BlockingLoadingOverlay({
    super.key,
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final cardWidth = math.min(320.0, MediaQuery.sizeOf(context).width - 48);

    return AbsorbPointer(
      absorbing: true,
      child: Material(
        color: c.bg.withValues(alpha: 0.94),
        child: SafeArea(
          child: Center(
            child: SizedBox(
              width: cardWidth,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: c.panel,
                  borderRadius: BorderRadius.circular(kRadiusLg),
                  border: Border.all(color: c.lineSoft),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: SizedBox(
                          width: 44,
                          height: 44,
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            color: kBrand,
                            backgroundColor: c.surface,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        title,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        subtitle,
                        textAlign: TextAlign.center,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Tam ekran — duyuru gönderimi bitene kadar etkileşimi engeller.
class SendBlockingOverlay extends StatelessWidget {
  const SendBlockingOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return const BlockingLoadingOverlay(
      title: 'Duyuru gönderiliyor',
      subtitle: 'Push bildirimi ile Wallet kartları güncelleniyor',
    );
  }
}
