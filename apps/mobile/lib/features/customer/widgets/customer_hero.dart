import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../theme.dart';
import '../../../widgets/ui.dart';

class CustomerHero extends StatelessWidget {
  const CustomerHero({
    super.key,
    required this.initials,
    required this.phone,
    required this.progress,
    required this.stampCount,
    required this.stampsRequired,
    required this.rewardReady,
    required this.hasWallet,
    required this.ledgerCount,
    this.displayName,
  });

  final String initials;
  final String phone;
  final String? displayName;
  final double progress;
  final int stampCount;
  final int stampsRequired;
  final bool rewardReady;
  final bool hasWallet;
  final int ledgerCount;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final title =
        displayName?.isNotEmpty == true ? displayName! : phone;
    final showPhoneSubtitle = displayName?.isNotEmpty == true;

    return PremiumCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              RingAvatar(
                initials: initials,
                progress: progress,
                rewardReady: rewardReady,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.dmSans(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.35,
                        height: 1.2,
                        color: c.ink,
                      ),
                    ),
                    if (showPhoneSubtitle) ...[
                      const SizedBox(height: 3),
                      Text(
                        phone,
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          color: c.muted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        if (rewardReady)
                          const StatusPill(
                            label: 'Ödül hazır',
                            tone: PillTone.success,
                          ),
                        if (hasWallet)
                          const StatusPill(
                            label: 'Wallet',
                            tone: PillTone.brand,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress > 0 ? progress : null,
              minHeight: 6,
              backgroundColor: c.surface,
              color: rewardReady ? kSuccess : kBrand,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                '$stampCount / $stampsRequired damga',
                style: GoogleFonts.dmSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: c.ink,
                ),
              ),
              const Spacer(),
              Text(
                '$ledgerCount işlem',
                style: GoogleFonts.dmSans(
                  fontSize: 12,
                  color: c.muted,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (hasWallet) ...[
                Text(
                  ' · ',
                  style: TextStyle(color: c.mutedLight, fontSize: 12),
                ),
                Text(
                  'Wallet',
                  style: GoogleFonts.dmSans(
                    fontSize: 12,
                    color: kBrand,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class RingAvatar extends StatelessWidget {
  const RingAvatar({
    super.key,
    required this.initials,
    required this.progress,
    required this.rewardReady,
  });

  final String initials;
  final double progress;
  final bool rewardReady;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SizedBox(
      width: 64,
      height: 64,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 64,
            height: 64,
            child: CircularProgressIndicator(
              value: progress > 0 ? progress : null,
              strokeWidth: 3.5,
              backgroundColor: c.surface,
              color: rewardReady ? kSuccess : kBrand,
            ),
          ),
          Container(
            width: 50,
            height: 50,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: rewardReady ? c.successSoft : c.brandMist,
              shape: BoxShape.circle,
            ),
            child: Text(
              initials,
              style: GoogleFonts.dmSans(
                fontWeight: FontWeight.w800,
                fontSize: 17,
                color: rewardReady ? kSuccess : kBrand,
                letterSpacing: -0.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
