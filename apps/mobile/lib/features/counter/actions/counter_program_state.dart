part of '../counter_controller.dart';

class CounterProgramStateLoader {
  CounterProgramStateLoader(this._c);

  final CounterController _c;

  void reloadProgramStates() {
    loadPointState();
    loadCashbackState();
    loadDiscountState();
    loadEventState();
    loadMembershipState();
    loadStaffState();
  }

  void clearProgramStates() {
    _c._pointState = null;
    _c._cashbackState = null;
    _c._discountState = null;
    _c._eventState = null;
    _c._membershipState = null;
    _c._staffState = null;
    _c._membershipPlanId = null;
  }

  Future<void> loadDiscountState() async {
    final c = _c._selected;
    final p = _c.programOfType('DISCOUNT_CARD');
    if (c == null || p == null) {
      if (!_c._disposed) _c._set(() => _c._discountState = null);
      return;
    }
    try {
      final state = await _c.api.discountCustomerState(p.id, c.id);
      if (!_c._disposed) _c._set(() => _c._discountState = state);
    } catch (_) {
      if (!_c._disposed) _c._set(() => _c._discountState = null);
    }
  }

  Future<void> loadEventState() async {
    final c = _c._selected;
    final p = _c.programOfType('EVENT_CARD');
    if (c == null || p == null) {
      if (!_c._disposed) _c._set(() => _c._eventState = null);
      return;
    }
    try {
      final state = await _c.api.eventCustomerState(p.id, c.id);
      if (!_c._disposed) _c._set(() => _c._eventState = state);
    } catch (_) {
      if (!_c._disposed) _c._set(() => _c._eventState = null);
    }
  }

  Future<void> loadMembershipState() async {
    final c = _c._selected;
    final p = _c.programOfType('MEMBERSHIP_CARD');
    if (c == null || p == null) {
      if (!_c._disposed) _c._set(() => _c._membershipState = null);
      return;
    }
    try {
      final state = await _c.api.membershipState(p.id, c.id);
      if (!_c._disposed) {
        _c._set(() {
          _c._membershipState = state;
          if (_c._membershipPlanId == null && state?.plans.isNotEmpty == true) {
            _c._membershipPlanId = state!.plans.first.id;
          }
        });
      }
    } catch (_) {
      if (!_c._disposed) _c._set(() => _c._membershipState = null);
    }
  }

  Future<void> loadStaffState() async {
    final c = _c._selected;
    final p = _c.programOfType('STAFF_CARD');
    if (c == null || p == null) {
      if (!_c._disposed) _c._set(() => _c._staffState = null);
      return;
    }
    try {
      final state = await _c.api.staffState(p.id, c.id);
      if (!_c._disposed) _c._set(() => _c._staffState = state);
    } catch (_) {
      if (!_c._disposed) _c._set(() => _c._staffState = null);
    }
  }

  Future<void> loadCashbackState() async {
    final c = _c._selected;
    final p = _c.programOfType('CASHBACK_CARD');
    if (c == null || p == null) {
      if (!_c._disposed) _c._set(() => _c._cashbackState = null);
      return;
    }
    try {
      final state = await _c.api.cashbackCustomerState(p.id, c.id);
      if (!_c._disposed) _c._set(() => _c._cashbackState = state);
    } catch (_) {
      if (!_c._disposed) _c._set(() => _c._cashbackState = null);
    }
  }

  Future<void> loadPointState() async {
    final c = _c._selected;
    final p = _c.programOfType('POINT_CARD');
    if (c == null || p == null) {
      if (!_c._disposed) _c._set(() => _c._pointState = null);
      return;
    }
    try {
      final state = await _c.api.pointCustomerState(p.id, c.id);
      if (!_c._disposed) _c._set(() => _c._pointState = state);
    } catch (_) {
      if (!_c._disposed) _c._set(() => _c._pointState = null);
    }
  }
}
