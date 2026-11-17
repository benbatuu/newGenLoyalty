part of '../counter_controller.dart';

class CounterStampActions {
  CounterStampActions(this._c);

  final CounterController _c;

  Future<void> stamp() async {
    final c = _c._selected;
    if (c == null) return;
    _c._set(() => _c._busy = true);
    try {
      final r = await _c.api.addStamp(
        c.id,
        productGroupId: _c._selectedChipId,
      );
      _c._set(() {
        _c._selected = r.customer;
        _c._stampsRequired = r.stampsRequired;
        _c._rewardLabel = r.rewardLabel;
        _c._results = _c._results
            .map((x) => x.id == r.customer.id ? r.customer : x)
            .toList();
      });
      _c.reloadProgramStates();
      _c.onToast(
        r.customer.rewardReady
            ? 'Ödül hazır: ${r.rewardLabel}'
            : 'Damga ${r.customer.stampCount}/${r.stampsRequired}',
      );
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }

  Future<void> handleStampScan(String code) async {
    _c._set(() => _c._busy = true);
    try {
      final r = await _c.api.stampByScan(code);
      HapticFeedback.heavyImpact();
      _c._set(() {
        _c._selected = r.customer;
        _c._results = [r.customer];
        _c._stampsRequired = r.stampsRequired;
        _c._rewardLabel = r.rewardLabel;
      });
      _c.reloadProgramStates();
      _c.onToast(
        r.customer.rewardReady
            ? 'QR damga — ödül hazır: ${r.rewardLabel}'
            : 'QR damga ${r.customer.stampCount}/${r.stampsRequired}',
      );
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }

  Future<void> redeem(
    BuildContext context, {
    String? tierId,
    String? rewardLabel,
  }) async {
    final c = _c._selected;
    if (c == null) return;

    var resolvedTierId = tierId;
    if (resolvedTierId == null) {
      final multi = _c.primaryMultiStamp;
      final List<ProgramTier> tiers;
      if (multi != null) {
        tiers = _c.tiersForSelectedLane(multi);
      } else if (_c._program != null) {
        tiers = _c._program!.tiers;
      } else {
        tiers = [];
      }
      if (tiers.length > 1) {
        final eligible =
            tiers.where((t) => c.stampCount >= t.redeemCost).toList();
        final pick = eligible.isNotEmpty ? eligible : tiers;
        if (!context.mounted) return;
        resolvedTierId = await showModalBottomSheet<String>(
          context: context,
          builder: (ctx) => SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'Hangi ödül kullanılsın?',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                ),
                ...pick.map(
                  (t) => ListTile(
                    title: Text(t.rewardLabel),
                    subtitle: Text('${t.redeemCost} damga'),
                    onTap: () => Navigator.pop(ctx, t.id),
                  ),
                ),
              ],
            ),
          ),
        );
        if (resolvedTierId == null) return;
      }
    }

    if (rewardLabel != null) {
      if (!context.mounted) return;
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Ödül kullan'),
          content: Text('$rewardLabel kullanılsın mı?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Vazgeç'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Onayla'),
            ),
          ],
        ),
      );
      if (ok != true) return;
    }

    _c._set(() => _c._busy = true);
    try {
      final r = await _c.api.redeem(c.id, tierId: resolvedTierId);
      _c._set(() {
        _c._selected = r.customer;
        _c._results = _c._results
            .map((x) => x.id == r.customer.id ? r.customer : x)
            .toList();
      });
      _c.reloadProgramStates();
      _c.onToast('Ödül kullanıldı: ${r.redeemed}');
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }
}
