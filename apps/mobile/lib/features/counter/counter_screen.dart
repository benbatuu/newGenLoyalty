import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth_state.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../widgets/send_blocking_overlay.dart';
import '../../widgets/ui.dart';
import 'counter_controller.dart';
import 'widgets/counter_cashback_panel.dart';
import 'widgets/counter_discount_panel.dart';
import 'widgets/counter_event_panel.dart';
import 'widgets/counter_membership_panel.dart';
import 'widgets/counter_phone_panel.dart';
import 'widgets/counter_point_panel.dart';
import 'widgets/counter_results_list.dart';
import 'widgets/counter_staff_panel.dart';
import 'widgets/counter_stamp_panel.dart';
import 'widgets/counter_summary_bar.dart';

class CounterScreen extends StatefulWidget {
  const CounterScreen({super.key});

  @override
  State<CounterScreen> createState() => _CounterScreenState();
}

class _CounterScreenState extends State<CounterScreen> {
  late final CounterController _ctrl;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthState>();
    _ctrl = CounterController(
      api: auth.api,
      cashierMode: auth.user?.isCashier ?? false,
      onToast: _toast,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _ctrl.initialize(
        requestPhoneFocus: auth.user?.isCashier ?? false,
      );
    });
  }

  void _toast(String msg) {
    if (!mounted) return;
    final c = context.colors;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        behavior: SnackBarBehavior.floating,
        backgroundColor: c.snackBarBg,
      ),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return ListenableBuilder(
      listenable: _ctrl,
      builder: (context, _) {
        final pointProgram = _ctrl.programOfType('POINT_CARD');
        final cashbackProgram = _ctrl.programOfType('CASHBACK_CARD');
        final discountProgram = _ctrl.programOfType('DISCOUNT_CARD');
        final eventProgram = _ctrl.programOfType('EVENT_CARD');
        final membershipProgram = _ctrl.programOfType('MEMBERSHIP_CARD');
        final staffProgram = _ctrl.programOfType('STAFF_CARD');
        final primaryMultiStamp = _ctrl.primaryMultiStamp;
        final multiStampRequired = primaryMultiStamp != null
            ? _ctrl.multiStampStampsRequired(primaryMultiStamp)
            : (_ctrl.stampsRequired ?? 10);
        final multiStampTiers = primaryMultiStamp != null
            ? _ctrl.tiersForSelectedLane(primaryMultiStamp)
            : <ProgramTier>[];

        final listView = ListView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
          children: [
            if (_ctrl.summary != null) ...[
              CounterSummaryBar(summary: _ctrl.summary!),
              const SizedBox(height: 18),
            ],
            CounterPhonePanel(
              phoneController: _ctrl.phone,
              phoneFocus: _ctrl.phoneFocus,
              cashierMode: _ctrl.cashierMode,
              phoneValid: _ctrl.phoneValid,
              busy: _ctrl.busy,
              registering: _ctrl.registering,
              onSearch: _ctrl.search,
              onRegister: () => _ctrl.register(context),
            ),
            CounterResultsList(
              results: _ctrl.results,
              selected: _ctrl.selected,
              onSelect: _ctrl.selectCustomer,
            ),
            if (_ctrl.selected != null)
              CounterStampPanel(
                selected: _ctrl.selected!,
                stampsRequired: _ctrl.stampsRequired,
                rewardLabel: _ctrl.rewardLabel,
                program: _ctrl.program,
                primaryMultiStamp: primaryMultiStamp,
                showClassicStamp: _ctrl.showClassicStampPanel,
                multiStampRequired: multiStampRequired,
                multiStampTiers: multiStampTiers,
                selectedChipId: _ctrl.selectedChipId,
                busy: _ctrl.busy,
                onChipSelected: _ctrl.selectChipId,
                onStamp: _ctrl.stamp,
                onRedeem: ({tierId, rewardLabel}) =>
                    _ctrl.redeem(context, tierId: tierId, rewardLabel: rewardLabel),
                onWalletInvite: () => _ctrl.walletInvite(context),
              ),
            if (_ctrl.selected != null && pointProgram != null)
              CounterPointPanel(
                program: pointProgram,
                programs: _ctrl.hub!.programsOfType('POINT_CARD'),
                selectedProgramId: _ctrl.selectedProgramId,
                pointState: _ctrl.pointState,
                pointAmount: _ctrl.pointAmount,
                pointCategoryId: _ctrl.pointCategoryId,
                busy: _ctrl.busy,
                onSelectProgram: _ctrl.selectProgram,
                onCategorySelected: _ctrl.selectPointCategory,
                onEarnPoints: () => _ctrl.earnPoints(context),
                onRedeemPoints: (cost, label) =>
                    _ctrl.redeemPoints(context, cost, label),
              ),
            if (_ctrl.selected != null && cashbackProgram != null)
              CounterCashbackPanel(
                program: cashbackProgram,
                programs: _ctrl.hub!.programsOfType('CASHBACK_CARD'),
                selectedProgramId: _ctrl.selectedProgramId,
                cashbackState: _ctrl.cashbackState,
                cashbackAmount: _ctrl.cashbackAmount,
                cashbackRedeemAmount: _ctrl.cashbackRedeemAmount,
                cashbackBasketAmount: _ctrl.cashbackBasketAmount,
                cashbackCategoryId: _ctrl.cashbackCategoryId,
                busy: _ctrl.busy,
                onSelectProgram: _ctrl.selectProgram,
                onCategorySelected: _ctrl.selectCashbackCategory,
                onEarnCashback: () => _ctrl.earnCashback(context),
                onRedeemCashback: () => _ctrl.redeemCashback(context),
              ),
            if (_ctrl.selected != null && discountProgram != null)
              CounterDiscountPanel(
                program: discountProgram,
                programs: _ctrl.hub!.programsOfType('DISCOUNT_CARD'),
                selectedProgramId: _ctrl.selectedProgramId,
                discountState: _ctrl.discountState,
                discountAmount: _ctrl.discountAmount,
                discountCategoryId: _ctrl.discountCategoryId,
                busy: _ctrl.busy,
                onSelectProgram: _ctrl.selectProgram,
                onCategorySelected: _ctrl.selectDiscountCategory,
                onVerifyDiscount: _ctrl.verifyDiscount,
                onApplyDiscount: () => _ctrl.applyDiscount(context),
              ),
            if (_ctrl.selected != null && eventProgram != null)
              CounterEventPanel(
                program: eventProgram,
                programs: _ctrl.hub!.programsOfType('EVENT_CARD'),
                selectedProgramId: _ctrl.selectedProgramId,
                eventState: _ctrl.eventState,
                busy: _ctrl.busy,
                onSelectProgram: _ctrl.selectProgram,
                onCheckIn: _ctrl.eventCheckIn,
              ),
            if (_ctrl.selected != null && membershipProgram != null)
              CounterMembershipPanel(
                program: membershipProgram,
                programs: _ctrl.hub!.programsOfType('MEMBERSHIP_CARD'),
                selectedProgramId: _ctrl.selectedProgramId,
                membershipState: _ctrl.membershipState,
                membershipPlanId: _ctrl.membershipPlanId,
                busy: _ctrl.busy,
                onSelectProgram: _ctrl.selectProgram,
                onPlanSelected: _ctrl.selectMembershipPlan,
                onActivateMembership: _ctrl.activateMembership,
                onUseBenefit: (label) =>
                    _ctrl.useMembershipBenefit(context, label),
              ),
            if (_ctrl.selected != null && staffProgram != null)
              CounterStaffPanel(
                program: staffProgram,
                programs: _ctrl.hub!.programsOfType('STAFF_CARD'),
                selectedProgramId: _ctrl.selectedProgramId,
                staffState: _ctrl.staffState,
                staffAmount: _ctrl.staffAmount,
                staffPin: _ctrl.staffPin,
                staffInviteCode: _ctrl.staffInviteCode,
                busy: _ctrl.busy,
                onSelectProgram: _ctrl.selectProgram,
                onEnrollStaff: _ctrl.enrollStaff,
                onRedeemStaff: _ctrl.redeemStaff,
              ),
          ],
        );

        return Stack(
          children: [
            Scaffold(
              backgroundColor: c.bg,
              floatingActionButton: Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: FloatingActionButton(
                  onPressed: _ctrl.busy
                      ? null
                      : () => _ctrl.scanWallet(context),
                  backgroundColor: c.fabBg,
                  foregroundColor: c.fabFg,
                  elevation: 6,
                  tooltip: 'Wallet QR okut',
                  child: const Icon(Icons.qr_code_scanner_rounded, size: 28),
                ),
              ),
              floatingActionButtonLocation:
                  FloatingActionButtonLocation.endFloat,
              body: KeyboardDismiss(child: listView),
            ),
            if (_ctrl.registering)
              const Positioned.fill(
                child: BlockingLoadingOverlay(
                  title: 'Müşteri kaydediliyor',
                  subtitle:
                      'Kayıt oluşturuluyor ve loyalty kartı hazırlanıyor',
                ),
              ),
          ],
        );
      },
    );
  }
}
