/// Default API base. Override with `--dart-define=API_URL=http://...`
/// Android emulator → http://10.0.2.2:3001
/// iOS simulator / desktop → http://localhost:3001
const String kApiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://192.168.1.115:3001',
);
