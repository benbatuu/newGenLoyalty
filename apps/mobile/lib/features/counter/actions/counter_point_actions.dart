part of '../counter_controller.dart';

class CounterPointActions {
  CounterPointActions(this._c);

  final CounterController _c;

  Future<void> earnPoints(BuildContext context) async {
    final c = _c._selected;
    final p = _c.programOfType('POINT_CARD');
    if (c == null || p == null) return;
    final amountKurus = parseTryToKurus(_c._pointAmount.text);
    if (amountKurus == null || amountKurus <= 0) {
      _c.onToast('Geçerli bir tutar girin (örn. 47,50)');
      return;
    }
    _c._set(() => _c._busy = true);
    try {
      final preview = await _c.api.previewPointEarn(
        programId: p.id,
        customerId: c.id,
        amountKurus: amountKurus,
        categoryId: _c._pointCategoryId,
      );
      if (!context.mounted) return;
      final camp = preview.campaignMultiplier > 1
          ? ' (kampanya ${preview.campaignMultiplier}x)'
          : '';
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Puan onayı'),
          content: Text(
            '${preview.amountTry} TL → ${preview.finalPoints} puan$camp. Onaylıyor musunuz?',
          ),
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

      final result = await _c.api.earnPoints(
        programId: p.id,
        customerId: c.id,
        amountKurus: amountKurus,
        categoryId: _c._pointCategoryId,
      );
      _c._pointAmount.clear();
      await _c._programState.loadPointState();
      _c.onToast('+${result.earned} puan · bakiye ${result.balance}');
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }

  Future<void> redeemPoints(
    BuildContext context,
    int pointCost,
    String rewardLabel,
  ) async {
    final c = _c._selected;
    final p = _c.programOfType('POINT_CARD');
    if (c == null || p == null) return;

    if (!context.mounted) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Puan kullan'),
        content: Text('$pointCost puan → $rewardLabel?'),
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

    _c._set(() => _c._busy = true);
    try {
      final result = await _c.api.pointRedeem(
        programId: p.id,
        customerId: c.id,
        pointCost: pointCost,
        rewardLabel: rewardLabel,
      );
      await _c._programState.loadPointState();
      _c.onToast('Ödül kullanıldı: ${result.rewardLabel} · bakiye ${result.balance}');
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }
}
