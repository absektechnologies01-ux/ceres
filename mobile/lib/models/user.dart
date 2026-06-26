class User {
  final String id;
  final String name;
  final String role;

  const User({required this.id, required this.name, required this.role});

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        role: json['role'] as String? ?? '',
      );
}

class ClassItem {
  final String id;
  final String name;
  final String academicYear;
  final String departmentId;

  const ClassItem({
    required this.id,
    required this.name,
    required this.academicYear,
    required this.departmentId,
  });

  factory ClassItem.fromJson(Map<String, dynamic> json) => ClassItem(
        id: json['id'] as String,
        name: json['name'] as String,
        academicYear: json['academic_year'] as String? ?? '',
        departmentId: json['department_id'] as String? ?? '',
      );

  @override
  bool operator ==(Object other) => other is ClassItem && other.id == id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => '$name ($academicYear)';
}

class CourseItem {
  final String id;
  final String code;
  final String name;
  final String departmentId;

  const CourseItem({
    required this.id,
    required this.code,
    required this.name,
    required this.departmentId,
  });

  factory CourseItem.fromJson(Map<String, dynamic> json) => CourseItem(
        id: json['id'] as String,
        code: json['code'] as String? ?? '',
        name: json['name'] as String,
        departmentId: json['department_id'] as String? ?? '',
      );

  @override
  bool operator ==(Object other) => other is CourseItem && other.id == id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => '$code — $name';
}
