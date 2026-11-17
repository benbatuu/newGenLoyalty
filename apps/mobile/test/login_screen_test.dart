import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ngl_mobile/api_client.dart';
import 'package:ngl_mobile/auth_state.dart';
import 'package:ngl_mobile/screens/login_screen.dart';
import 'package:ngl_mobile/theme.dart';
import 'package:ngl_mobile/theme_mode_controller.dart';

void main() {
  testWidgets('LoginScreen shows email and password fields', (tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthState(ApiClient())),
          ChangeNotifierProvider(create: (_) => ThemeModeController()),
        ],
        child: MaterialApp(
          theme: buildAppTheme(Brightness.light),
          home: const LoginScreen(),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Giriş yap'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2));
  });
}
