import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../notification_send_controller.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  static const _historyPageSize = 8;

  final _message = TextEditingController();
  final _scroll = ScrollController();
  NotifyStatus? _status;
  bool _loading = true;
  bool _sending = false;
  String? _error;
  String? _ok;
  String? _pickedMessageId;
  int _historyPage = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _message.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load({bool resetHistoryPage = false}) async {
    setState(() {
      _loading = true;
      _error = null;
      if (resetHistoryPage) _historyPage = 0;
    });
    try {
      final s = await context.read<AuthState>().api.notificationStatus();
      if (mounted) {
        setState(() {
          _status = s;
          final totalPages = _historyTotalPages(s.history.length);
          if (_historyPage >= totalPages) {
            _historyPage = totalPages > 0 ? totalPages - 1 : 0;
          }
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  int _historyTotalPages(int itemCount) {
    if (itemCount == 0) return 0;
    return (itemCount + _historyPageSize - 1) ~/ _historyPageSize;
  }

  void _setHistoryPage(int page) {
    final totalPages = _historyTotalPages(_status?.history.length ?? 0);
    if (totalPages == 0) return;
    setState(() => _historyPage = page.clamp(0, totalPages - 1));
  }

  void _reuseMessage(String message, {String? historyId}) {
    final clean = stripBroadcastStamps(message);
    setState(() {
      _message.text = clean;
      _message.selection = TextSelection.fromPosition(
        TextPosition(offset: clean.length),
      );
      _pickedMessageId = historyId;
      _error = null;
      _ok = 'Mesaj düzenleyip tekrar gönderebilirsiniz';
    });
    if (_scroll.hasClients) {
      _scroll.animateTo(
        0,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> _send() async {
    final text = stripBroadcastStamps(_message.text.trim());
    if (text.length < 2) {
      setState(() => _error = 'En az 2 karakter girin');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
      _ok = null;
    });
    context.read<NotificationSendController>().setSending(true);
    try {
      final res = await context.read<AuthState>().api.sendNotification(text);
      if (mounted) {
        setState(() {
          _ok =
              '${res.devices} cihaza gönderildi · ${res.synced} pass güncellendi';
          _message.clear();
          _pickedMessageId = null;
        });
      }
      await _load(resetHistoryPage: true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) {
        context.read<NotificationSendController>().setSending(false);
        setState(() => _sending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (_loading && _status == null) {
      return Center(child: CircularProgressIndicator(color: c.accent));
    }

    final s = _status;

    return ListView(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_error!, style: const TextStyle(color: kDanger)),
          ),
        if (_ok != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_ok!, style: const TextStyle(color: kSuccess)),
          ),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _message,
                maxLines: 4,
                maxLength: 120,
                enabled: !_sending,
                onTapOutside: onTapOutsideDismissKeyboard,
                decoration: InputDecoration(
                  labelText: 'Duyuru metni',
                  hintText: 'Örn: Bugün tüm filtre kahvelerde %20 indirim!',
                  filled: true,
                  fillColor: c.surface,
                ),
              ),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: _sending ? null : _send,
                icon: const Icon(Icons.send_rounded, size: 18),
                label: Text(_sending ? 'Gönderiliyor…' : 'Wallet\'a gönder'),
              ),
            ],
          ),
        ),
        if (s != null) ...[
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _NotifyStat(
                  label: 'Kayıtlı cihaz',
                  value: '${s.registeredDevices}',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _NotifyStat(
                  label: 'Apple pass',
                  value: '${s.applePassCount}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          PremiumCard(
            child: Text(
              s.registeredDevices == 0
                  ? 'Henüz Wallet cihazı yok. Müşteriler pass ekledikten sonra '
                      'duyuru gönderebilirsiniz.'
                  : 'Mesaj kayıtlı Apple Wallet cihazlarına push olarak gider '
                      've pass arka yüzü güncellenir.',
              style: TextStyle(color: c.muted, height: 1.45, fontSize: 13),
            ),
          ),
          if (s.lastMessage != null) ...[
            const SizedBox(height: 12),
            _HistoryTile(
              message: s.lastMessage!,
              meta: s.lastSentAt != null ? shortDate(s.lastSentAt) : 'Son duyuru',
              selected: _pickedMessageId == 'last',
              onTap: () => _reuseMessage(s.lastMessage!, historyId: 'last'),
            ),
          ],
          if (s.history.isNotEmpty) ...[
            const SizedBox(height: 20),
            const SectionLabel('Geçmiş — tekrar göndermek için dokunun'),
            const SizedBox(height: 8),
            ...s.history
                .skip(_historyPage * _historyPageSize)
                .take(_historyPageSize)
                .map(
                  (h) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _HistoryTile(
                      message: h.message,
                      meta: '${shortDate(h.createdAt)} · ${h.devices} cihaz',
                      selected: _pickedMessageId == h.id,
                      onTap: () => _reuseMessage(h.message, historyId: h.id),
                    ),
                  ),
                ),
            if (s.history.length > _historyPageSize) ...[
              const SizedBox(height: 4),
              _HistoryPager(
                page: _historyPage + 1,
                totalPages: _historyTotalPages(s.history.length),
                totalItems: s.history.length,
                onPrevious: _historyPage > 0
                    ? () => _setHistoryPage(_historyPage - 1)
                    : null,
                onNext: _historyPage <
                        _historyTotalPages(s.history.length) - 1
                    ? () => _setHistoryPage(_historyPage + 1)
                    : null,
              ),
            ],
          ],
        ],
      ],
    );
  }
}

class _NotifyStat extends StatelessWidget {
  const _NotifyStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: c.panel,
        borderRadius: BorderRadius.circular(kRadius),
        border: Border.all(color: c.lineSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: c.muted, fontSize: 11)),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.dmSans(
              fontWeight: FontWeight.w800,
              fontSize: 22,
              letterSpacing: -0.3,
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryPager extends StatelessWidget {
  const _HistoryPager({
    required this.page,
    required this.totalPages,
    required this.totalItems,
    required this.onPrevious,
    required this.onNext,
  });

  final int page;
  final int totalPages;
  final int totalItems;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: c.panel,
        borderRadius: BorderRadius.circular(kRadius),
        border: Border.all(color: c.lineSoft),
      ),
      child: Row(
        children: [
          _PagerButton(
            icon: Icons.chevron_left_rounded,
            label: 'Önceki',
            onPressed: onPrevious,
          ),
          Expanded(
            child: Text(
              'Sayfa $page / $totalPages · $totalItems kayıt',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: c.muted,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          _PagerButton(
            icon: Icons.chevron_right_rounded,
            label: 'Sonraki',
            onPressed: onNext,
            iconAfterLabel: true,
          ),
        ],
      ),
    );
  }
}

class _PagerButton extends StatelessWidget {
  const _PagerButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.iconAfterLabel = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final bool iconAfterLabel;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final enabled = onPressed != null;
    final child = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (!iconAfterLabel) Icon(icon, size: 18),
        if (!iconAfterLabel) const SizedBox(width: 2),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: enabled ? c.ink : c.muted.withValues(alpha: 0.45),
          ),
        ),
        if (iconAfterLabel) const SizedBox(width: 2),
        if (iconAfterLabel) Icon(icon, size: 18),
      ],
    );

    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: enabled ? c.ink : c.muted,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: child,
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({
    required this.message,
    required this.meta,
    required this.onTap,
    this.selected = false,
  });

  final String message;
  final String meta;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return PremiumCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? kBrand : c.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: selected ? kBrand : c.line,
              ),
            ),
            child: Icon(
              Icons.replay_rounded,
              size: 18,
              color: selected ? c.chipSelectedFg : c.muted,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message,
                  style: TextStyle(
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  meta,
                  style: TextStyle(color: c.muted, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
