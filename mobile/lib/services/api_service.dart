import 'package:dio/dio.dart';
import 'server_config.dart';
import '../models/user.dart';
import '../models/session.dart';
import '../models/sheet.dart';

/// Central HTTP client with JWT interceptor and automatic token refresh.
class ApiService {
  late final Dio _dio;
  final Future<String?> Function() _getAccessToken;
  final Future<String?> Function() _getRefreshToken;
  final Future<String> Function(String) _doRefresh;
  final Future<void> Function(String) _onTokenRefreshed;
  final Future<void> Function() _onLogout;

  ApiService({
    required Future<String?> Function() getAccessToken,
    required Future<String?> Function() getRefreshToken,
    required Future<String> Function(String) doRefresh,
    required Future<void> Function(String) onTokenRefreshed,
    required Future<void> Function() onLogout,
  })  : _getAccessToken = getAccessToken,
        _getRefreshToken = getRefreshToken,
        _doRefresh = doRefresh,
        _onTokenRefreshed = onTokenRefreshed,
        _onLogout = onLogout {
    _dio = Dio(BaseOptions(
      baseUrl: ServerConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
    ));
    _dio.interceptors.add(_buildAuthInterceptor());
  }

  /// Re-point this client at a newly paired backend without needing to
  /// recreate the singleton (e.g. after re-pairing via ServerSetupScreen).
  void updateBaseUrl(String url) {
    _dio.options.baseUrl = url;
  }

  QueuedInterceptorsWrapper _buildAuthInterceptor() {
    return QueuedInterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          try {
            final refreshToken = await _getRefreshToken();
            if (refreshToken == null) {
              await _onLogout();
              handler.next(error);
              return;
            }
            final newToken = await _doRefresh(refreshToken);
            await _onTokenRefreshed(newToken);
            // Retry original request
            error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
            final response = await _dio.fetch(error.requestOptions);
            handler.resolve(response);
            return;
          } catch (_) {
            await _onLogout();
          }
        }
        handler.next(error);
      },
    );
  }

  // ── Classes & Courses ─────────────────────────────────────────────────────

  Future<List<ClassItem>> getClasses() async {
    final response = await _dio.get('/classes');
    return (response.data as List)
        .map((e) => ClassItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<CourseItem>> getCourses() async {
    final response = await _dio.get('/courses');
    return (response.data as List)
        .map((e) => CourseItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  Future<ScanSession> createSession({
    required String classId,
    required String courseId,
  }) async {
    final response = await _dio.post('/sessions', data: {
      'class_id': classId,
      'course_id': courseId,
    });
    return ScanSession.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ScanSession> closeSession(String sessionId) async {
    final response = await _dio.put('/sessions/$sessionId/close');
    return ScanSession.fromJson(response.data as Map<String, dynamic>);
  }

  // ── Sheets ────────────────────────────────────────────────────────────────

  Future<Sheet> uploadSheet({
    required String sessionId,
    required String imageUrl,
    required int uploadOrder,
    String? ocrText,
    Map<String, dynamic>? ocrMetadata,
  }) async {
    final response = await _dio.post('/sessions/$sessionId/sheets', data: {
      'image_url': imageUrl,
      'upload_order': uploadOrder,
      if (ocrText != null) 'ocr_text': ocrText,
      if (ocrMetadata != null) 'ocr_metadata': ocrMetadata,
    });
    return Sheet.fromJson(response.data as Map<String, dynamic>);
  }

  Future<int> getFlaggedSheetCount(String sessionId) async {
    final response = await _dio.get('/sessions/$sessionId/sheets/flagged');
    return (response.data as List).length;
  }
}
