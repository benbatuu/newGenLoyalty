part of '../counter_controller.dart';

class CounterEventActions {
  CounterEventActions(this._c);

  final CounterController _c;

  Future<void> eventCheckIn() async {
    final c = _c._selected;
    final p = _c.programOfType('EVENT_CARD');
    if (c == null || p == null) return;

    _c._set(() => _c._busy = true);
    try {
      final result = await _c.api.eventCheckIn(
        programId: p.id,
        customerId: c.id,
      );
      await _c._programState.loadEventState();
      _c.onToast(
        'Check-in ${result.entryNumber}/${result.entryLimit} · ${result.entriesRemaining} kaldı',
      );
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }
}
