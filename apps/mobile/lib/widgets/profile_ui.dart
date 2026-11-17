import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme.dart';
import '../asset_urls.dart';
import 'ui.dart';

/// Profil kimlik kartı — işletme logosu / adı + kullanıcı bilgisi.
class ProfileIdentityCard extends StatelessWidget {
  const ProfileIdentityCard({
    super.key,
    required this.name,
    required this.email,
    required this.roleLabel,
    this.tenantName,
    this.tenantSlug,
    this.planLabel,
    this.logoUrl,
    this.brandColor,
  });

  final String name;
  final String email;
  final String roleLabel;
  final String? tenantName;
  final String? tenantSlug;
  final String? planLabel;
  final String? logoUrl;
  final Color? brandColor;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: c.panel,
        borderRadius: BorderRadius.circular(kRadiusLg),
        border: Border.all(color: c.lineSoft),
        boxShadow: [
          BoxShadow(
            color: c.cardShadow,
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _BusinessLogo(
              logoUrl: logoUrl,
              initials: _tenantInitialsFromName(tenantName),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: GoogleFonts.dmSans(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: c.ink,
                      letterSpacing: -0.3,
                      height: 1.2,
                    ),
                  ),
                  if (tenantName != null && tenantName!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      tenantName!,
                      style: GoogleFonts.dmSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: c.muted,
                        height: 1.3,
                      ),
                    ),
                  ],
                  const SizedBox(height: 3),
                  Text(
                    email,
                    style: GoogleFonts.dmSans(
                      fontSize: 13,
                      color: c.muted,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      StatusPill(label: roleLabel, tone: PillTone.brand),
                      if (planLabel != null)
                        StatusPill(label: planLabel!, tone: PillTone.neutral),
                      if (tenantSlug != null)
                        StatusPill(
                          label: '/$tenantSlug',
                          tone: PillTone.neutral,
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _tenantInitialsFromName(String? tenantName) {
  final label = tenantName?.trim();
  if (label == null || label.isEmpty) return 'StampWell';
  final parts = label.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }
  final word = parts.first;
  return word.length >= 2
      ? word.substring(0, 2).toUpperCase()
      : word[0].toUpperCase();
}

class _BusinessLogo extends StatelessWidget {
  const _BusinessLogo({
    required this.logoUrl,
    required this.initials,
  });

  final String? logoUrl;
  final String initials;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final url = resolveAssetUrl(logoUrl);
    final hasLogo = url.isNotEmpty;

    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: c.panel,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.line),
        boxShadow: [
          BoxShadow(
            color: c.cardShadow,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: hasLogo
          ? Image.network(
              url,
              width: 56,
              height: 56,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => _initials(c),
            )
          : _initials(c),
    );
  }

  Widget _initials(AppColors c) {
    return Container(
      color: c.surface,
      alignment: Alignment.center,
      child: Text(
        initials,
        style: GoogleFonts.dmSans(
          fontSize: 18,
          fontWeight: FontWeight.w800,
          color: c.ink,
          letterSpacing: -0.5,
        ),
      ),
    );
  }
}

class ProfileStatChip extends StatelessWidget {
  const ProfileStatChip({
    super.key,
    required this.label,
    required this.value,
    this.tone = PillTone.neutral,
  });

  final String label;
  final String value;
  final PillTone tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Expanded(
      child: PremiumCard(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionLabel(label),
            const SizedBox(height: 6),
            Text(
              value,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.dmSans(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: c.ink,
                letterSpacing: -0.2,
                height: 1.25,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ProfileSection extends StatelessWidget {
  const ProfileSection({
    super.key,
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: GoogleFonts.dmSans(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: c.muted,
              letterSpacing: 0.2,
            ),
          ),
        ),
        PremiumCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: _withDividers(children),
          ),
        ),
      ],
    );
  }

  List<Widget> _withDividers(List<Widget> items) {
    if (items.isEmpty) return items;
    final out = <Widget>[items.first];
    for (var i = 1; i < items.length; i++) {
      out.add(const Divider(height: 1, indent: 56));
      out.add(items[i]);
    }
    return out;
  }
}

class ProfileMenuRow extends StatelessWidget {
  const ProfileMenuRow({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.iconTone = kBrand,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color iconTone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(kRadius),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: iconTone.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: iconTone),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: c.ink,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle!,
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          color: c.muted,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              ?trailing,
              if (onTap != null && trailing == null)
                Icon(Icons.chevron_right_rounded, color: c.mutedLight),
            ],
          ),
        ),
      ),
    );
  }
}

String subscriptionStatusLabel(String status) => switch (status) {
      'TRIAL' => 'Deneme',
      'ACTIVE' => 'Aktif',
      'CANCELLED' => 'İptal',
      'SUSPENDED' => 'Askıda',
      _ => status,
    };

String planCodeLabel(String code) {
  final key = code.trim().toLowerCase();
  return switch (key) {
    'cafe' => 'Cafe',
    'growth' => 'Growth',
    'pro' => 'Pro',
    'enterprise' => 'Enterprise',
    _ => key.isEmpty
        ? code
        : key.split(RegExp(r'[\s_-]+')).map((part) {
            if (part.isEmpty) return part;
            return part[0].toUpperCase() + part.substring(1);
          }).join(' '),
  };
}

Color parseBrandColor(String? hex) {
  if (hex == null || hex.length < 7) return kBrand;
  try {
    return Color(int.parse(hex.replaceFirst('#', 'FF'), radix: 16));
  } catch (_) {
    return kBrand;
  }
}
