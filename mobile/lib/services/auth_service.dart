import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';
import '../models/user.dart';

class AuthService {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // ── Token storage ─────────────────────────────────────────────────────────

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: AppConfig.accessTokenKey, value: accessToken);
    await _storage.write(key: AppConfig.refreshTokenKey, value: refreshToken);
  }

  Future<String?> getAccessToken() =>
      _storage.read(key: AppConfig.accessTokenKey);

  Future<String?> getRefreshToken() =>
      _storage.read(key: AppConfig.refreshTokenKey);

  Future<void> clearTokens() async {
    await _storage.delete(key: AppConfig.accessTokenKey);
    await _storage.delete(key: AppConfig.refreshTokenKey);
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  /// Returns the logged-in [User] or throws on failure.
  Future<({User user, String accessToken, String refreshToken})> login(
    String email,
    String password,
  ) async {
    final dio = Dio();
    final response = await dio.post(
      '${AppConfig.apiBaseUrl}/auth/login',
      data: {'username': email, 'password': password},
      options: Options(contentType: Headers.formUrlEncodedContentType),
    );

    final data = response.data as Map<String, dynamic>;
    final user = User(
      id: '',
      name: data['name'] as String,
      role: data['role'] as String,
    );

    return (
      user: user,
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
    );
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  Future<String> refreshAccessToken(String refreshToken) async {
    final dio = Dio();
    final response = await dio.post(
      '${AppConfig.apiBaseUrl}/auth/refresh',
      data: {'refresh_token': refreshToken},
    );
    return (response.data as Map<String, dynamic>)['access_token'] as String;
  }
}
