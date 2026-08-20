import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  AuthStatus _status = AuthStatus.unknown;
  User? _user;
  String? _error;
  bool _loading = false;

  AuthStatus get status => _status;
  User? get user => _user;
  String? get error => _error;
  bool get loading => _loading;
  bool get isLoggedIn => _status == AuthStatus.authenticated;

  // ── Boot — check for stored tokens ────────────────────────────────────────

  Future<void> init() async {
    final token = await _authService.getAccessToken();
    if (token != null) {
      // Token exists — treat as authenticated (the API interceptor will handle expiry)
      _status = AuthStatus.authenticated;
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  Future<bool> login(String email, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.login(email, password);

      if (result.user.role != 'scanner_operator') {
        _error = 'Only scanner operators can use this app.';
        _status = AuthStatus.unauthenticated;
        _loading = false;
        notifyListeners();
        return false;
      }

      await _authService.saveTokens(
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      );
      _user = result.user;
      _status = AuthStatus.authenticated;
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      final msg = e.toString();
      final unreachable = e is DioException &&
          (e.type == DioExceptionType.connectionTimeout ||
              e.type == DioExceptionType.receiveTimeout ||
              e.type == DioExceptionType.sendTimeout ||
              e.type == DioExceptionType.connectionError);
      if (msg.contains('401') || msg.contains('400')) {
        _error = 'Invalid credentials. Please try again.';
      } else if (unreachable ||
          msg.contains('SocketException') ||
          msg.contains('Connection refused') ||
          msg.contains('Network is unreachable') ||
          msg.contains('Failed host lookup')) {
        _error = 'Cannot reach server. Check your network connection.';
      } else {
        _error = 'Login failed: $msg';
      }
      _status = AuthStatus.unauthenticated;
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  Future<void> logout() async {
    await _authService.clearTokens();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  // ── Token helpers (used by ApiService) ───────────────────────────────────

  Future<String?> getAccessToken() => _authService.getAccessToken();
  Future<String?> getRefreshToken() => _authService.getRefreshToken();

  Future<String> doRefresh(String refreshToken) =>
      _authService.refreshAccessToken(refreshToken);

  Future<void> onTokenRefreshed(String newToken) async {
    final refreshToken = await _authService.getRefreshToken();
    if (refreshToken != null) {
      await _authService.saveTokens(
        accessToken: newToken,
        refreshToken: refreshToken,
      );
    }
  }
}
