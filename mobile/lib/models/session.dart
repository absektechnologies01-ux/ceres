enum SessionStatus { active, closed }

class ScanSession {
  final String id;
  final String operatorId;
  final String classId;
  final String courseId;
  final SessionStatus status;
  final DateTime createdAt;

  const ScanSession({
    required this.id,
    required this.operatorId,
    required this.classId,
    required this.courseId,
    required this.status,
    required this.createdAt,
  });

  factory ScanSession.fromJson(Map<String, dynamic> json) => ScanSession(
        id: json['id'] as String,
        operatorId: json['operator_id'] as String,
        classId: json['class_id'] as String,
        courseId: json['course_id'] as String,
        status: (json['status'] as String) == 'active'
            ? SessionStatus.active
            : SessionStatus.closed,
        createdAt: DateTime.parse(json['created_at'] as String),
      );
}
