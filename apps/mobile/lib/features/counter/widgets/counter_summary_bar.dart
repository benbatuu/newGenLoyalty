import 'package:flutter/material.dart';

import '../../../models.dart';
import '../../../theme.dart';

class CounterSummaryBar extends StatelessWidget {
  const CounterSummaryBar({super.key, required this.summary});

  final DaySummary summary;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [c.heroStart, c.heroEnd],
        ),
        borderRadius: BorderRadius.circular(kRadiusLg),
        boxShadow: [
          BoxShadow(
            color: c.heroShadow,
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          _CompactStat(
            label: 'Damga',
            value: '${summary.stampsToday}',
            onDark: true,
            accent: true,
          ),
          _StatDivider(onDark: true),
          _CompactStat(
            label: 'Ödül',
            value: '${summary.redeemsToday}',
            onDark: true,
          ),
          _StatDivider(onDark: true),
          _CompactStat(
            label: 'Hazır',
            value: '${summary.rewardReadyCount}',
            onDark: true,
          ),
        ],
      ),
    );
  }
}

class _CompactStat extends StatelessWidget {
  const _CompactStat({
    required this.label,
    required this.value,
    this.accent = false,
    this.onDark = false,
  });

  final String label;
  final String value;
  final bool accent;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 20,
              color: onDark ? Colors.white : (accent ? kBrand : c.ink),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: onDark ? Colors.white70 : c.muted,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatDivider extends StatelessWidget {
  const _StatDivider({this.onDark = false});

  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: 1,
      height: 32,
      color: onDark ? Colors.white24 : c.lineSoft,
      margin: const EdgeInsets.symmetric(horizontal: 8),
    );
  }
}
