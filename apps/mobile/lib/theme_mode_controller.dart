import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AppThemePreference { light, dark }

class ThemeModeController extends ChangeNotifier {
  static const _storageKey = 'app_theme_preference';

  AppThemePreference _preference = AppThemePreference.light;
  bool _loaded = false;

  AppThemePreference get preference => _preference;
  bool get loaded => _loaded;

  ThemeMode get themeMode => _preference == AppThemePreference.dark
      ? ThemeMode.dark
      : ThemeMode.light;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    _preference = raw == 'dark'
        ? AppThemePreference.dark
        : AppThemePreference.light;
    _loaded = true;
    notifyListeners();
  }

  Future<void> setPreference(AppThemePreference value) async {
    if (_preference == value) return;
    _preference = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _storageKey,
      value == AppThemePreference.dark ? 'dark' : 'light',
    );
  }

  Future<void> toggle() async {
    await setPreference(
      _preference == AppThemePreference.light
          ? AppThemePreference.dark
          : AppThemePreference.light,
    );
  }
}
