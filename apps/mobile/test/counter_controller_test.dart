import 'package:flutter_test/flutter_test.dart';
import 'package:ngl_mobile/api/api_client.dart';
import 'package:ngl_mobile/features/counter/counter_controller.dart';

void main() {
  test('CounterController initializes with empty selection', () {
    final controller = CounterController(
      api: ApiClient(),
      cashierMode: true,
      onToast: (_) {},
    );

    expect(controller.selected, isNull);
    expect(controller.results, isEmpty);

    controller.dispose();
  });

  test('selectChipId updates active chip', () {
    final controller = CounterController(
      api: ApiClient(),
      cashierMode: false,
      onToast: (_) {},
    );

    controller.selectChipId('chip-1');
    expect(controller.selectedChipId, 'chip-1');

    controller.dispose();
  });
}
