part of '../counter_controller.dart';

class CounterDiscountActions {
  CounterDiscountActions(this._c);

  final CounterController _c;

  Future<void> verifyDiscount() async {
    final c = _c._selected;
    final p = _c.programOfType('DISCOUNT_CARD');
    if (c == null || p == null) return;

    _c._set(() => _c._busy = true);
    try {
      final result = await _c.api.verifyDiscount(
        programId: p.id,
        customerId: c.id,
        categoryId: _c._discountCategoryId,
      );
      _c.onToast('Geçerli: ${result.effective.label}');
      await _c._programState.loadDiscountState();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }

  Future<void> applyDiscount(BuildContext context) async {
    final c = _c._selected;
    final p = _c.programOfType('DISCOUNT_CARD');
    if (c == null || p == null) return;

    final amountKurus = _c._discountAmount.text.trim().isEmpty
        ? null
        : parseTryToKurus(_c._discountAmount.text);

    if (!context.mounted) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('İndirim uygula'),
        content: Text(
          _c._discountState?.effective?.label != null
              ? '${_c._discountState!.effective!.label} uygulansın mı?'
              : 'İndirim uygulansın mı?',
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
      final result = await _c.api.applyDiscount(
        programId: p.id,
        customerId: c.id,
        categoryId: _c._discountCategoryId,
        amountKurus: amountKurus,
      );
      _c._discountAmount.clear();
      await _c._programState.loadDiscountState();
      _c.onToast('İndirim uygulandı: ${result.effective.label}');
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }

  Future<void> handleDiscountFromScan(
    String code,
    ProgramSummary program,
    ParsedPassBarcode parsed,
  ) async {
    _c._set(() => _c._busy = true);
    try {
      final result = await _c.api.scanDiscount(
        code: code,
        programId: program.id,
        categoryId: _c._discountCategoryId,
      );
      HapticFeedback.heavyImpact();
      await _c.selectCustomerFromQr(parsed.customerId);
      await _c._programState.loadDiscountState();
      _c.onToast('İndirim doğrulandı: ${result.effective.label}');
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }
}
