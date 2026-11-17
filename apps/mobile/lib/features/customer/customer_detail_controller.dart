import '../../api_client.dart';
import '../../models.dart';
import '../../program_helpers.dart';

class ProgramBalanceRow {
  ProgramBalanceRow({
    required this.programName,
    required this.typeLabel,
    required this.value,
    required this.hasActivity,
  });

  final String programName;
  final String typeLabel;
  final String value;
  final bool hasActivity;
}

class CustomerDetailController {
  CustomerDetailController({
    required this.api,
    required this.customer,
    required this.stampsRequired,
  });

  final ApiClient api;
  final Customer customer;
  final int stampsRequired;

  bool loading = true;
  String? error;
  String? vipTier;
  List<String> tags = [];
  List<CustomerNote> notes = [];
  bool smsOptOut = false;
  List<ProgramBalanceRow> programs = [];
  bool busy = false;

  Future<void> load() async {
    loading = true;
    error = null;
    try {
      final id = customer.id;
      final results = await Future.wait<Object?>([
        api.customerVipTier(id),
        api.customerTags(id),
        api.customerNotes(id),
        api.customerSmsOptOut(id),
        api.programsHub(),
      ]);
      final hub = results[4] as ProgramsHub?;
      final programRows = await _loadProgramBalances(
        id,
        hub?.programs ?? [],
      );
      vipTier = results[0] as String?;
      tags = results[1] as List<String>;
      notes = results[2] as List<CustomerNote>;
      smsOptOut = results[3] as bool;
      programs = programRows;
    } on ApiException catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  Future<List<ProgramBalanceRow>> _loadProgramBalances(
    String customerId,
    List<ProgramSummary> programs,
  ) async {
    final rows = <ProgramBalanceRow>[];
    for (final p in programs) {
      final row = await _balanceForProgram(p, customerId);
      rows.add(row);
    }
    if (rows.isEmpty && customer.stampCount > 0) {
      rows.add(
        ProgramBalanceRow(
          programName: 'Damga kartı',
          typeLabel: 'Genel',
          value: '${customer.stampCount}/$stampsRequired damga',
          hasActivity: true,
        ),
      );
    }
    return rows;
  }

  Future<ProgramBalanceRow> _balanceForProgram(
    ProgramSummary program,
    String customerId,
  ) async {
    final base = ProgramBalanceRow(
      programName: program.name,
      typeLabel: programTypeLabel(program.type),
      value: 'Henüz kayıt bulunamadı',
      hasActivity: false,
    );

    switch (program.type) {
      case 'POINT_CARD':
        final s = await api.pointCustomerState(program.id, customerId);
        if (s == null) return base;
        return ProgramBalanceRow(
          programName: program.name,
          typeLabel: base.typeLabel,
          value: '${s.balance} puan',
          hasActivity: s.balance > 0,
        );
      case 'CASHBACK_CARD':
        final s = await api.cashbackCustomerState(program.id, customerId);
        if (s == null) return base;
        return ProgramBalanceRow(
          programName: program.name,
          typeLabel: base.typeLabel,
          value: s.balanceKurus > 0 ? '₺${s.balanceTry}' : '0',
          hasActivity: s.balanceKurus > 0,
        );
      case 'DISCOUNT_CARD':
        final s = await api.discountCustomerState(program.id, customerId);
        if (s == null) return base;
        if (!s.valid) return base;
        return ProgramBalanceRow(
          programName: program.name,
          typeLabel: base.typeLabel,
          value: s.effective?.label.isNotEmpty == true
              ? s.effective!.label
              : 'İndirim aktif',
          hasActivity: true,
        );
      case 'EVENT_CARD':
        final s = await api.eventCustomerState(program.id, customerId);
        if (s == null) return base;
        return ProgramBalanceRow(
          programName: program.name,
          typeLabel: base.typeLabel,
          value: '${s.entriesUsed}/${s.entryLimit} giriş',
          hasActivity: s.entriesUsed > 0,
        );
      case 'MEMBERSHIP_CARD':
        final s = await api.membershipState(program.id, customerId);
        if (s == null || s.status != 'active') return base;
        return ProgramBalanceRow(
          programName: program.name,
          typeLabel: base.typeLabel,
          value: s.plan?.label ?? 'Aktif üyelik',
          hasActivity: true,
        );
      case 'STAFF_CARD':
        final s = await api.staffState(program.id, customerId);
        if (s == null) return base;
        return ProgramBalanceRow(
          programName: program.name,
          typeLabel: base.typeLabel,
          value:
              '${formatKurusTry(s.usage.monthlySpendKurus)} / ${formatKurusTry(s.usage.monthlyBudgetKurus)}',
          hasActivity: s.usage.monthlySpendKurus > 0,
        );
      case 'STAMP_CARD':
      case 'MULTI_STAMP':
        final stamps = customer.stampCount;
        return ProgramBalanceRow(
          programName: program.name,
          typeLabel: base.typeLabel,
          value: stamps > 0
              ? '$stamps/$stampsRequired damga'
              : '0 damga',
          hasActivity: stamps > 0,
        );
      default:
        return base;
    }
  }

  Future<String?> addTag(String tag) async {
    if (tag.trim().isEmpty) return null;
    busy = true;
    try {
      await api.addCustomerTag(customer.id, tag.trim());
      await load();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } finally {
      busy = false;
    }
  }

  Future<String?> addNote(String body) async {
    if (body.trim().isEmpty) return null;
    busy = true;
    try {
      await api.addCustomerNote(customer.id, body.trim());
      await load();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } finally {
      busy = false;
    }
  }

  Future<String?> toggleSms() async {
    busy = true;
    try {
      final next = !smsOptOut;
      await api.setCustomerSmsOptOut(customer.id, next);
      smsOptOut = next;
      return null;
    } on ApiException catch (e) {
      return e.message;
    } finally {
      busy = false;
    }
  }

  String computeInitials() {
    final name = customer.displayName?.trim();
    if (name != null && name.isNotEmpty) {
      final parts = name.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
      if (parts.length >= 2) {
        return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
      }
      return name.substring(0, 1).toUpperCase();
    }
    return customer.phone.length >= 2
        ? customer.phone.substring(customer.phone.length - 2)
        : '?';
  }
}
