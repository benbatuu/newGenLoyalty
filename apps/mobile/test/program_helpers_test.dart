import 'package:flutter_test/flutter_test.dart';
import 'package:ngl_mobile/models.dart';
import 'package:ngl_mobile/program_helpers.dart';

void main() {
  test('programTypeLabel maps known types', () {
    expect(programTypeLabel('POINT_CARD'), 'Puan kartı');
    expect(programTypeLabel('UNKNOWN'), 'UNKNOWN');
  });

  test('activityTypeLabel maps stamp and redeem', () {
    expect(activityTypeLabel('STAMP'), 'Damga');
    expect(activityTypeLabel('POINT_EARN'), 'Puan kazanıldı');
    expect(activityTypeLabel('CUSTOM'), 'CUSTOM');
  });

  test('formatKurusTry formats Turkish lira', () {
    expect(formatKurusTry(1250), '₺12,50');
    expect(formatKurusTry(99), '₺0,99');
  });

  test('programCardSummary for cashback shows percent', () {
    final summary = programCardSummary(
      ProgramSummary(
        id: 'p1',
        name: 'Cashback',
        type: 'CASHBACK_CARD',
        config: {'earnPercent': 5},
        tiers: const [],
      ),
    );
    expect(summary, '%5 cashback');
  });
}
