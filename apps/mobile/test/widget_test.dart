import 'package:flutter_test/flutter_test.dart';
import 'package:ngl_mobile/main.dart';

void main() {
  testWidgets('App boots to login', (tester) async {
    await tester.pumpWidget(const DokunKazanApp());
    await tester.pump(); // bootstrap start
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.textContaining('Dokun'), findsWidgets);
  });
}
