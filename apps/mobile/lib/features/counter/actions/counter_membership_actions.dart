part of '../counter_controller.dart';

class CounterMembershipActions {
  CounterMembershipActions(this._c);

  final CounterController _c;

  Future<void> activateMembership() async {
    final c = _c._selected;
    final p = _c.programOfType('MEMBERSHIP_CARD');
    final planId = _c._membershipPlanId;
    if (c == null || p == null || planId == null) return;

    _c._set(() => _c._busy = true);
    try {
      final result = await _c.api.activateMembership(
        programId: p.id,
        customerId: c.id,
        planId: planId,
      );
      await _c._programState.loadMembershipState();
      _c.onToast('Üyelik aktif: ${result.plan.label}');
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }

  Future<void> useMembershipBenefit(
    BuildContext context,
    String benefitLabel,
  ) async {
    final c = _c._selected;
    final p = _c.programOfType('MEMBERSHIP_CARD');
    if (c == null || p == null) return;

    if (!context.mounted) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hak kullan'),
        content: Text('$benefitLabel kullanılsın mı?'),
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
      final result = await _c.api.useMembershipBenefit(
        programId: p.id,
        customerId: c.id,
        benefitLabel: benefitLabel,
      );
      await _c._programState.loadMembershipState();
      _c.onToast('${result.benefitLabel} · kalan ${result.remaining}');
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }
}
