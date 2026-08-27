import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;

/// Firebase — `flutterfire configure` veya Console indirmeleri ile senkron tutun.
class DefaultFirebaseOptions {
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDtqJkD5fiPUzwMU8hURNEdcNiNVJAo20Q',
    appId: '1:1032920156549:android:78ad3c769cd89c4f0c5cec',
    messagingSenderId: '1032920156549',
    projectId: 'newgenloyalty-328a8',
    storageBucket: 'newgenloyalty-328a8.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBJVSbauPvUPFDK7JovKtgsi2oa34EU7x0',
    appId: '1:1032920156549:ios:a701598bc43a2f3c0c5cec',
    messagingSenderId: '1032920156549',
    projectId: 'newgenloyalty-328a8',
    storageBucket: 'newgenloyalty-328a8.firebasestorage.app',
    iosBundleId: 'com.ng.loyalty',
  );

  static bool get isConfigured => true;
}
