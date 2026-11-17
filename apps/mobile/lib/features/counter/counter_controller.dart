import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../api_client.dart';
import '../../models.dart';
import '../../phone_utils.dart';
import '../../theme.dart';
import '../../widgets/invite_qr_sheet.dart';
import '../../widgets/ui.dart';
import '../../widgets/wallet_invite_picker.dart';
import '../../screens/pass_qr_scan_screen.dart';
import 'counter_amount_utils.dart';
import 'counter_scan_handler.dart';

part 'actions/counter_cashback_actions.dart';
part 'actions/counter_customer_actions.dart';
part 'actions/counter_discount_actions.dart';
part 'actions/counter_event_actions.dart';
part 'actions/counter_membership_actions.dart';
part 'actions/counter_point_actions.dart';
part 'actions/counter_program_state.dart';
part 'actions/counter_staff_actions.dart';
part 'actions/counter_stamp_actions.dart';

class CounterController extends ChangeNotifier {
  CounterController({
    required this.api,
    required this.cashierMode,
    required this.onToast,
  }) {
    _phone.addListener(_onPhoneChanged);
    _programState = CounterProgramStateLoader(this);
    _customerActions = CounterCustomerActions(this);
    _stampActions = CounterStampActions(this);
    _cashbackActions = CounterCashbackActions(this);
    _pointActions = CounterPointActions(this);
    _discountActions = CounterDiscountActions(this);
    _eventActions = CounterEventActions(this);
    _membershipActions = CounterMembershipActions(this);
    _staffActions = CounterStaffActions(this);
  }

  final ApiClient api;
  final bool cashierMode;
  final void Function(String) onToast;

  final _phone = TextEditingController();
  final _phoneFocus = FocusNode();
  final _pointAmount = TextEditingController();
  final _cashbackAmount = TextEditingController();
  final _cashbackRedeemAmount = TextEditingController();
  final _cashbackBasketAmount = TextEditingController();
  final _discountAmount = TextEditingController();
  final _staffAmount = TextEditingController();
  final _staffPin = TextEditingController();
  final _staffInviteCode = TextEditingController();
  List<Customer> _results = [];
  Customer? _selected;
  int? _stampsRequired;
  String? _rewardLabel;
  DaySummary? _summary;
  LoyaltyProgram? _program;
  ProgramsHub? _hub;
  final _selectedProgramId = <String, String>{};
  PointCustomerState? _pointState;
  CashbackCustomerState? _cashbackState;
  DiscountCustomerState? _discountState;
  EventCustomerState? _eventState;
  MembershipState? _membershipState;
  StaffState? _staffState;
  String? _selectedChipId;
  String? _pointCategoryId;
  String? _cashbackCategoryId;
  String? _discountCategoryId;
  String? _membershipPlanId;
  bool _busy = false;
  bool _registering = false;
  bool _disposed = false;

  late final CounterProgramStateLoader _programState;
  late final CounterCustomerActions _customerActions;
  late final CounterStampActions _stampActions;
  late final CounterCashbackActions _cashbackActions;
  late final CounterPointActions _pointActions;
  late final CounterDiscountActions _discountActions;
  late final CounterEventActions _eventActions;
  late final CounterMembershipActions _membershipActions;
  late final CounterStaffActions _staffActions;

  TextEditingController get phone => _phone;
  FocusNode get phoneFocus => _phoneFocus;
  TextEditingController get pointAmount => _pointAmount;
  TextEditingController get cashbackAmount => _cashbackAmount;
  TextEditingController get cashbackRedeemAmount => _cashbackRedeemAmount;
  TextEditingController get cashbackBasketAmount => _cashbackBasketAmount;
  TextEditingController get discountAmount => _discountAmount;
  TextEditingController get staffAmount => _staffAmount;
  TextEditingController get staffPin => _staffPin;
  TextEditingController get staffInviteCode => _staffInviteCode;
  List<Customer> get results => _results;
  Customer? get selected => _selected;
  int? get stampsRequired => _stampsRequired;
  String? get rewardLabel => _rewardLabel;
  DaySummary? get summary => _summary;
  LoyaltyProgram? get program => _program;
  ProgramsHub? get hub => _hub;
  Map<String, String> get selectedProgramId => _selectedProgramId;
  PointCustomerState? get pointState => _pointState;
  CashbackCustomerState? get cashbackState => _cashbackState;
  DiscountCustomerState? get discountState => _discountState;
  EventCustomerState? get eventState => _eventState;
  MembershipState? get membershipState => _membershipState;
  StaffState? get staffState => _staffState;
  String? get selectedChipId => _selectedChipId;
  String? get pointCategoryId => _pointCategoryId;
  String? get cashbackCategoryId => _cashbackCategoryId;
  String? get discountCategoryId => _discountCategoryId;
  String? get membershipPlanId => _membershipPlanId;
  bool get busy => _busy;
  bool get registering => _registering;
  bool get phoneValid => isValidPhoneInput(_phone.text);

  ProgramSummary? get primaryMultiStamp => _hub?.primaryMultiStamp;
  bool get showClassicStampPanel => primaryMultiStamp == null;

  List<WalletInviteProgram> get walletInvitePrograms =>
      filterWalletPrograms(_hub?.programs ?? []);

  bool get needsWalletProgramPicker => walletInvitePrograms.length > 1;

  void toast(String msg) => onToast(msg);

  void _set(VoidCallback fn) {
    fn();
    if (!_disposed) notifyListeners();
  }

  ProgramSummary? programOfType(String type) {
    final hub = _hub;
    if (hub == null) return null;
    final list = hub.programsOfType(type);
    if (list.isEmpty) return null;
    final id = _selectedProgramId[type];
    if (id != null) {
      for (final p in list) {
        if (p.id == id) return p;
      }
    }
    return list.first;
  }

  ProgramSummary? programById(String programId) {
    for (final p in _hub?.programs ?? const <ProgramSummary>[]) {
      if (p.id == programId) return p;
    }
    return null;
  }

  Future<void> selectCustomerFromQr(String customerId) async {
    for (final c in _results) {
      if (c.id == customerId) {
        _set(() => _selected = c);
        return;
      }
    }
    _set(() {
      _selected = Customer(
        id: customerId,
        phone: '',
        stampCount: 0,
        rewardReady: false,
        hasWallet: true,
      );
      _results = [_selected!];
    });
  }

  void focusProgram(ProgramSummary program) {
    _set(() => _selectedProgramId[program.type] = program.id);
  }

  String programScanHint(ProgramSummary program) {
    switch (program.type) {
      case 'POINT_CARD':
        return 'Puan kartı — işlem paneli açıldı';
      case 'EVENT_CARD':
        return 'Etkinlik kartı — check-in paneli açıldı';
      case 'MEMBERSHIP_CARD':
        return 'Üyelik kartı — panel açıldı';
      case 'STAFF_CARD':
        return 'Personel kartı — panel açıldı';
      default:
        return '${program.name} — işlem paneli açıldı';
    }
  }

  void _onPhoneChanged() {
    if (!_disposed) notifyListeners();
  }

  List<ProgramTier> tiersForSelectedLane(ProgramSummary program) {
    if (program.multiStampMode == 'LANES' && _selectedChipId != null) {
      return program.tiersForLane(_selectedChipId);
    }
    return program.tiers;
  }

  int multiStampStampsRequired(ProgramSummary program) {
    final tiers = tiersForSelectedLane(program);
    if (tiers.isNotEmpty) return tiers.first.threshold;
    return _stampsRequired ?? 10;
  }

  void initialize({required bool requestPhoneFocus}) {
    _loadSummary();
    _loadProgram();
    _loadProgramsHub();
    if (requestPhoneFocus) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_disposed) _phoneFocus.requestFocus();
      });
    }
  }

  Future<void> _loadProgramsHub() async {
    try {
      final hub = await api.programsHub();
      if (_disposed) return;
      _set(() {
        _hub = hub;
        if (hub != null) {
          for (final type in [
            'POINT_CARD',
            'CASHBACK_CARD',
            'DISCOUNT_CARD',
            'EVENT_CARD',
            'MEMBERSHIP_CARD',
            'STAFF_CARD',
          ]) {
            final list = hub.programsOfType(type);
            if (list.length == 1) {
              _selectedProgramId[type] = list.first.id;
            }
          }
          final multi = hub.primaryMultiStamp;
          if (multi != null && multi.stampOptions.isNotEmpty) {
            _selectedChipId = multi.stampOptions.first.id;
          }
        }
      });
    } catch (_) {}
  }

  void selectProgram(String type, String id) {
    _set(() => _selectedProgramId[type] = id);
    switch (type) {
      case 'POINT_CARD':
        _programState.loadPointState();
      case 'CASHBACK_CARD':
        _programState.loadCashbackState();
      case 'DISCOUNT_CARD':
        _programState.loadDiscountState();
      case 'EVENT_CARD':
        _programState.loadEventState();
      case 'MEMBERSHIP_CARD':
        _programState.loadMembershipState();
      case 'STAFF_CARD':
        _programState.loadStaffState();
    }
  }

  void reloadProgramStates() => _programState.reloadProgramStates();

  void selectCustomer(Customer customer) {
    _set(() {
      _selected = customer;
      _stampsRequired = null;
      _programState.clearProgramStates();
    });
    reloadProgramStates();
  }

  void selectChipId(String chipId) {
    _set(() => _selectedChipId = chipId);
  }

  void selectPointCategory(String? categoryId) {
    _set(() => _pointCategoryId = categoryId);
  }

  void selectCashbackCategory(String? categoryId) {
    _set(() => _cashbackCategoryId = categoryId);
  }

  void selectDiscountCategory(String? categoryId) {
    _set(() => _discountCategoryId = categoryId);
  }

  void selectMembershipPlan(String planId) {
    _set(() => _membershipPlanId = planId);
  }

  Future<void> _loadProgram() async {
    try {
      final p = await api.loyaltyProgram();
      if (_disposed) return;
      _set(() {
        _program = p;
        _selectedChipId = p?.stampOptions.isNotEmpty == true
            ? p!.stampOptions.first.id
            : null;
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _disposed = true;
    _phone.removeListener(_onPhoneChanged);
    _phoneFocus.dispose();
    _phone.dispose();
    _pointAmount.dispose();
    _cashbackAmount.dispose();
    _cashbackRedeemAmount.dispose();
    _cashbackBasketAmount.dispose();
    _discountAmount.dispose();
    _staffAmount.dispose();
    _staffPin.dispose();
    _staffInviteCode.dispose();
    super.dispose();
  }

  Future<void> _loadSummary() async {
    try {
      final s = await api.daySummary();
      if (!_disposed) _set(() => _summary = s);
    } catch (_) {}
  }

  Future<void> search() => _customerActions.search();

  Future<void> register(BuildContext context) =>
      _customerActions.register(context);

  Future<void> openInvite(BuildContext context, String url) async {
    if (!context.mounted) return;
    await showInviteQrSheet(
      context,
      url: url,
      phoneLabel:
          _selected != null ? formatPhone(_selected!.phone) : null,
    );
  }

  Future<void> stamp() => _stampActions.stamp();

  Future<void> scanWallet(BuildContext context) async {
    if (_busy) return;
    final code = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const PassQrScanScreen()),
    );
    if (!context.mounted || code == null || code.isEmpty) return;
    await CounterScanHandler.handleScanResult(
      context: context,
      controller: this,
      code: code,
    );
  }

  Future<void> handleStampScan(String code) =>
      _stampActions.handleStampScan(code);

  Future<void> handleCashbackFromScan(
    BuildContext context,
    String code,
    ParsedPassBarcode parsed,
  ) =>
      _cashbackActions.handleCashbackFromScan(context, code, parsed);

  Future<void> earnCashback(BuildContext context) =>
      _cashbackActions.earnCashback(context);

  Future<void> redeemCashback(BuildContext context) =>
      _cashbackActions.redeemCashback(context);

  Future<void> redeemPoints(
    BuildContext context,
    int pointCost,
    String rewardLabel,
  ) =>
      _pointActions.redeemPoints(context, pointCost, rewardLabel);

  Future<void> verifyDiscount() => _discountActions.verifyDiscount();

  Future<void> applyDiscount(BuildContext context) =>
      _discountActions.applyDiscount(context);

  Future<void> handleDiscountFromScan(
    String code,
    ProgramSummary program,
    ParsedPassBarcode parsed,
  ) =>
      _discountActions.handleDiscountFromScan(code, program, parsed);

  Future<void> eventCheckIn() => _eventActions.eventCheckIn();

  Future<void> activateMembership() => _membershipActions.activateMembership();

  Future<void> useMembershipBenefit(
    BuildContext context,
    String benefitLabel,
  ) =>
      _membershipActions.useMembershipBenefit(context, benefitLabel);

  Future<void> enrollStaff() => _staffActions.enrollStaff();

  Future<void> redeemStaff() => _staffActions.redeemStaff();

  Future<void> walletInvite(BuildContext context) =>
      _customerActions.walletInvite(context);

  Future<void> earnPoints(BuildContext context) =>
      _pointActions.earnPoints(context);

  Future<void> redeem(
    BuildContext context, {
    String? tierId,
    String? rewardLabel,
  }) =>
      _stampActions.redeem(context, tierId: tierId, rewardLabel: rewardLabel);
}
