part of '../counter_controller.dart';

class CounterCustomerActions {
  CounterCustomerActions(this._c);

  final CounterController _c;

  Future<void> search() async {
    _c._set(() => _c._busy = true);
    try {
      final list = await _c.api.findCustomers(_c._phone.text);
      _c._set(() {
        _c._results = list;
        _c._selected = null;
        _c._programState.clearProgramStates();
      });
      if (list.isEmpty) {
        _c.onToast('Kayıt yok — yeni müşteri ekleyebilirsiniz');
      }
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }

  Future<void> register(BuildContext context) async {
    List<String>? programIds;
    if (_c.needsWalletProgramPicker) {
      final picked = await showWalletInvitePicker(
        context,
        programs: _c.walletInvitePrograms,
        phoneLabel: _c._phone.text.trim().isNotEmpty ? _c._phone.text.trim() : null,
        title: 'Kayıt — hangi kartlar eklensin?',
        confirmLabel: 'Kaydet ve davet gönder',
      );
      if (picked == null || picked.isEmpty) return;
      programIds = picked;
    } else if (_c.walletInvitePrograms.length == 1) {
      programIds = [_c.walletInvitePrograms.first.programId];
    }

    _c._set(() {
      _c._busy = true;
      _c._registering = true;
    });
    dismissKeyboard();
    try {
      final r = await _c.api.registerCustomer(
        _c._phone.text,
        programIds: programIds,
      );
      if (!_c._disposed) {
        _c._set(() {
          _c._selected = r.customer;
          _c._results = [r.customer];
          _c._stampsRequired = r.stampsRequired;
          _c._rewardLabel = r.rewardLabel;
          _c._registering = false;
        });
      }
      _c.reloadProgramStates();
      if (r.walletInviteUrl != null && context.mounted) {
        await _c.openInvite(context, r.walletInviteUrl!);
      }
      _c.onToast(
        r.walletInviteUrl != null
            ? 'Kayıt tamam — Wallet daveti hazır'
            : 'Kayıt + ilk damga tamam',
      );
      await _c._loadSummary();
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) {
        _c._set(() {
          _c._busy = false;
          _c._registering = false;
        });
      }
    }
  }

  Future<void> walletInvite(BuildContext context) async {
    final c = _c._selected;
    if (c == null) return;

    List<String>? programIds;
    if (_c.needsWalletProgramPicker) {
      final picked = await showWalletInvitePicker(
        context,
        programs: _c.walletInvitePrograms,
        phoneLabel: formatPhone(c.phone),
        title: 'Wallet daveti — hangi kartlar?',
        confirmLabel: 'QR oluştur',
      );
      if (picked == null || picked.isEmpty) return;
      programIds = picked;
    } else if (_c.walletInvitePrograms.length == 1) {
      programIds = [_c.walletInvitePrograms.first.programId];
    }

    _c._set(() => _c._busy = true);
    try {
      final url = await _c.api.walletInviteWithPrograms(
        c.id,
        programIds: programIds,
      );
      if (context.mounted) await _c.openInvite(context, url);
    } on ApiException catch (e) {
      _c.onToast(e.message);
    } finally {
      if (!_c._disposed) _c._set(() => _c._busy = false);
    }
  }
}
