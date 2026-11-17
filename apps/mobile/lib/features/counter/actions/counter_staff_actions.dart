part of '../counter_controller.dart';

class CounterStaffActions {
  CounterStaffActions(this._c);

  final CounterController _c;

  Future<void> enrollStaff() async {
    final c = _c._selected;
    final p = _c.programOfType('STAFF_CARD');
    if (c == null || p == null) return;

    _c._set(() => _c._busy = true);
    try {
      await _c.api.enrollStaff(
        programId: p.id,
        customerId: c.id,
        inviteCode: _c._staffInviteCode.text.trim().isEmpty
            ? null
            : _c._staffInviteCode.text.trim(),
      );
      _c._staffInviteCode.clear();
      await _c._programState.loadStaffState();
      _c.onToast('Personel kartına kaydedildi');
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }

  Future<void> redeemStaff() async {
    final c = _c._selected;
    final p = _c.programOfType('STAFF_CARD');
    if (c == null || p == null) return;

    final amountKurus = parseTryToKurus(_c._staffAmount.text);
    if (amountKurus == null || amountKurus <= 0) {
      _c.onToast('Geçerli bir tutar girin');
      return;
    }

    _c._set(() => _c._busy = true);
    try {
      final result = await _c.api.redeemStaff(
        programId: p.id,
        customerId: c.id,
        amountKurus: amountKurus,
        managerPin: _c._staffPin.text.trim().isEmpty ? null : _c._staffPin.text.trim(),
      );
      _c._staffAmount.clear();
      _c._staffPin.clear();
      await _c._programState.loadStaffState();
      _c.onToast(
        'Personel hakkı kullanıldı · ₺${(result.amountKurus / 100).toStringAsFixed(2).replaceAll('.', ',')}',
      );
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }
}
