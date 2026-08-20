import 'package:shared_preferences/shared_preferences.dart';

/// Runtime-configurable server addresses, set once per device via QR pairing
/// (see ServerSetupScreen) instead of being baked into the app at compile
/// time. Persisted locally so each phone can point at whatever backend/ESP32
/// it paired with, independent of every other phone running the same build.
class ServerConfig {
  static const _apiUrlKey = 'server_api_base_url';
  static const _esp32UrlKey = 'server_esp32_ws_url';

  static String apiBaseUrl = '';
  static String esp32WsUrl = '';

  static bool get isConfigured =>
      apiBaseUrl.isNotEmpty && esp32WsUrl.isNotEmpty;

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    apiBaseUrl = prefs.getString(_apiUrlKey) ?? '';
    esp32WsUrl = prefs.getString(_esp32UrlKey) ?? '';
  }

  static Future<void> save({
    required String apiUrl,
    required String esp32Url,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_apiUrlKey, apiUrl);
    await prefs.setString(_esp32UrlKey, esp32Url);
    apiBaseUrl = apiUrl;
    esp32WsUrl = esp32Url;
  }
}
