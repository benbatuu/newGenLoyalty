part of '../counter_controller.dart';

class CounterCashbackActions {
  CounterCashbackActions(this._c);

  final CounterController _c;

  Future<void> handleCashbackFromScan(
    BuildContext context,
    String code,
    ParsedPassBarcode parsed,
  ) async {
    _c._set(() => _c._busy = true);
    CashbackCustomerState? state;
    try {
      state = await _c.api.cashbackCustomerState(
        parsed.programId!,
        parsed.customerId,
      );
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
    if (!context.mounted || state == null) {
      if (state == null) _c.onToast('Cashback kartı bulunamadı');
      return;
    }

    await _c.selectCustomerFromQr(parsed.customerId);
    if (!context.mounted) return;

    final amountController = TextEditingController();
    var categoryId = _c._cashbackCategoryId;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final dc = ctx.colors;
          final amountKurus = parseTryToKurus(amountController.text);
          final previewEarn = amountKurus != null && amountKurus > 0
              ? (amountKurus * state!.earnPercent / 100).floor() / 100
              : null;

          return AlertDialog(
            title: const Text('Cashback tanımla'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    state!.programName.isNotEmpty
                        ? state.programName
                        : 'Cashback kartı',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Mevcut bakiye: ₺${state.balanceTry}',
                    style: TextStyle(color: dc.muted, fontSize: 13),
                  ),
                  if (state.earnPercent > 0)
                    Text(
                      'Oran: %${state.earnPercent}',
                      style: TextStyle(color: dc.muted, fontSize: 13),
                    ),
                  const SizedBox(height: 14),
                  TextField(
                    onTapOutside: onTapOutsideDismissKeyboard,
                    controller: amountController,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Hesap tutarı (TL)',
                      hintText: '500',
                    ),
                    autofocus: true,
                    onChanged: (_) => setDialogState(() {}),
                  ),
                  if (previewEarn != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Tahmini: +₺${previewEarn.toStringAsFixed(2).replaceAll('.', ',')}',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: dc.accent,
                      ),
                    ),
                  ],
                  if (state.categories.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ChoiceChip(
                          label: const Text('Genel'),
                          selected: categoryId == null,
                          onSelected: (_) =>
                              setDialogState(() => categoryId = null),
                        ),
                        ...state.categories.map((cat) {
                          final selected = categoryId == cat.categoryId;
                          final label = cat.multiplier != 1
                              ? '${cat.label ?? cat.categoryId} (${cat.multiplier}x)'
                              : (cat.label ?? cat.categoryId);
                          return ChoiceChip(
                            label: Text(label),
                            selected: selected,
                            onSelected: (_) => setDialogState(
                              () => categoryId = cat.categoryId,
                            ),
                          );
                        }),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('İptal'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Tamamla'),
              ),
            ],
          );
        },
      ),
    );
    if (confirmed != true || !context.mounted) {
      amountController.dispose();
      return;
    }

    final amountKurus = parseTryToKurus(amountController.text);
    amountController.dispose();
    if (amountKurus == null || amountKurus <= 0) {
      _c.onToast('Geçerli bir tutar girin');
      return;
    }

    _c._set(() => _c._busy = true);
    try {
      final preview = await _c.api.previewCashbackEarn(
        programId: parsed.programId!,
        customerId: parsed.customerId,
        amountKurus: amountKurus,
        categoryId: categoryId,
      );
      if (!context.mounted) return;
      final camp = preview.campaignMultiplier > 1
          ? ' (kampanya ${preview.campaignMultiplier}x)'
          : '';
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Cashback onayı'),
          content: Text(
            '${preview.amountTry} TL → +₺${preview.earnedTry} cashback (%${preview.earnPercent})$camp. Onaylıyor musunuz?',
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

      final r = await _c.api.scanCashbackEarn(
        code: code,
        amountKurus: amountKurus,
        categoryId: categoryId,
        confirmed: true,
      );
      HapticFeedback.heavyImpact();
      _c._set(() {
        _c._selected = r.customer;
        _c._results = [r.customer];
        _c._cashbackCategoryId = categoryId;
      });
      await _c._programState.loadCashbackState();
      _c.onToast('+₺${r.earnedTry} cashback · Yeni bakiye ₺${r.newBalanceTry}');
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }

  Future<void> earnCashback(BuildContext context) async {
    final c = _c._selected;
    final p = _c.programOfType('CASHBACK_CARD');
    if (c == null || p == null) return;
    final amountKurus = parseTryToKurus(_c._cashbackAmount.text);
    if (amountKurus == null || amountKurus <= 0) {
      _c.onToast('Geçerli bir tutar girin (örn. 500)');
      return;
    }
    _c._set(() => _c._busy = true);
    try {
      final preview = await _c.api.previewCashbackEarn(
        programId: p.id,
        customerId: c.id,
        amountKurus: amountKurus,
        categoryId: _c._cashbackCategoryId,
      );
      if (!context.mounted) return;
      final camp = preview.campaignMultiplier > 1
          ? ' (kampanya ${preview.campaignMultiplier}x)'
          : '';
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Cashback onayı'),
          content: Text(
            '${preview.amountTry} TL → +₺${preview.earnedTry} cashback (%${preview.earnPercent})$camp. Onaylıyor musunuz?',
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

      final result = await _c.api.earnCashback(
        programId: p.id,
        customerId: c.id,
        amountKurus: amountKurus,
        categoryId: _c._cashbackCategoryId,
      );
      _c._cashbackAmount.clear();
      await _c._programState.loadCashbackState();
      _c.onToast('+₺${result.earnedTry} cashback · bakiye ₺${result.balanceTry}');
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }

  Future<void> redeemCashback(BuildContext context) async {
    final c = _c._selected;
    final p = _c.programOfType('CASHBACK_CARD');
    if (c == null || p == null) return;
    final amountKurus = parseTryToKurus(_c._cashbackRedeemAmount.text);
    if (amountKurus == null || amountKurus <= 0) {
      _c.onToast('Kullanılacak tutarı girin');
      return;
    }
    final basketKurus = _c._cashbackBasketAmount.text.trim().isEmpty
        ? null
        : parseTryToKurus(_c._cashbackBasketAmount.text);

    if (!context.mounted) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Bakiye kullan'),
        content: Text(
          '₺${_c._cashbackRedeemAmount.text.trim()} bakiye kullanılsın mı?',
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

    _c._set(() => _c._busy = true);
    try {
      final result = await _c.api.redeemCashbackCredit(
        programId: p.id,
        customerId: c.id,
        amountKurus: amountKurus,
        basketKurus: basketKurus,
      );
      _c._cashbackRedeemAmount.clear();
      _c._cashbackBasketAmount.clear();
      await _c._programState.loadCashbackState();
      _c.onToast(
        '₺${result.redeemedTry} kullanıldı · bakiye ₺${result.balanceTry}',
      );
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }
}
