import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ngl_mobile/main.dart';

void main() {
  testWidgets('App builds without throwing', (tester) async {
    await tester.pumpWidget(const DokunKazanApp());
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
