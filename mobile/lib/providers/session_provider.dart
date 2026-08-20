import 'package:flutter/foundation.dart';
import '../models/session.dart';
import '../models/sheet.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class SessionProvider extends ChangeNotifier {
  final ApiService _api;

  SessionProvider(this._api);

  /// Exposed so ServerSetupScreen can re-point the shared client after
  /// re-pairing, without recreating this provider.
  ApiService get api => _api;

  // ── State ─────────────────────────────────────────────────────────────────

  ScanSession? _activeSession;
  List<ClassItem> _classes = [];
  List<CourseItem> _courses = [];
  ClassItem? _selectedClass;
  CourseItem? _selectedCourse;

  bool _loading = false;
  String? _error;
  int _sheetCount = 0;
  int _flaggedCount = 0;

  ScanSession? get activeSession => _activeSession;
  List<ClassItem> get classes => _classes;
  List<CourseItem> get courses => _courses;
  ClassItem? get selectedClass => _selectedClass;
  CourseItem? get selectedCourse => _selectedCourse;
  bool get loading => _loading;
  String? get error => _error;
  int get sheetCount => _sheetCount;
  int get flaggedCount => _flaggedCount;
  bool get hasActiveSession => _activeSession != null;

  // ── Load class/course lists ───────────────────────────────────────────────

  Future<void> loadClassesAndCourses() async {
    _loading = true;
    _error = null;
    _selectedClass = null;
    _selectedCourse = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _api.getClasses(),
        _api.getCourses(),
      ]);
      _classes = results[0] as List<ClassItem>;
      _courses = results[1] as List<CourseItem>;
    } catch (e) {
      _error = 'Failed to load classes and courses. Check your connection.';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void selectClass(ClassItem? cls) {
    _selectedClass = cls;
    _selectedCourse = null; // reset course when class changes
    notifyListeners();
  }

  void selectCourse(CourseItem? course) {
    _selectedCourse = course;
    notifyListeners();
  }

  // ── Session lifecycle ─────────────────────────────────────────────────────

  Future<bool> startSession() async {
    if (_selectedClass == null || _selectedCourse == null) return false;

    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _activeSession = await _api.createSession(
        classId: _selectedClass!.id,
        courseId: _selectedCourse!.id,
      );
      _sheetCount = 0;
      _flaggedCount = 0;
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Failed to start session. Please try again.';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> endSession() async {
    if (_activeSession == null) return false;

    _loading = true;
    _error = null;
    notifyListeners();

    try {
      await _api.closeSession(_activeSession!.id);
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Failed to close session.';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  void clearSession() {
    _activeSession = null;
    _sheetCount = 0;
    _flaggedCount = 0;
    _selectedClass = null;
    _selectedCourse = null;
    notifyListeners();
  }

  // ── Sheet upload ──────────────────────────────────────────────────────────

  Future<Sheet?> uploadSheet({
    required String imageUrl,
    String? ocrText,
    Map<String, dynamic>? ocrMetadata,
  }) async {
    if (_activeSession == null) return null;

    try {
      final sheet = await _api.uploadSheet(
        sessionId: _activeSession!.id,
        imageUrl: imageUrl,
        uploadOrder: _sheetCount + 1,
        ocrText: ocrText,
        ocrMetadata: ocrMetadata,
      );
      _sheetCount++;
      if (sheet.flagged) _flaggedCount++;
      notifyListeners();
      return sheet;
    } catch (e) {
      _error = 'Failed to upload sheet. Please try again.';
      notifyListeners();
      return null;
    }
  }
}
