class GradeModel {
  final int id;
  final int? courseId;
  final String? courseName;
  final String name;
  final double monthlyFee;
  final String currency;
  final bool isActive;

  const GradeModel({
    required this.id,
    this.courseId,
    this.courseName,
    required this.name,
    this.monthlyFee = 0,
    this.currency = 'INR',
    this.isActive = true,
  });

  factory GradeModel.fromJson(Map<String, dynamic> json) {
    return GradeModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      courseId: json['course_id'] as int?,
      courseName: json['course_name'] as String?,
      name: json['name'] ?? '',
      monthlyFee: _toDouble(json['monthly_fee']),
      currency: json['currency'] as String? ?? 'INR',
      isActive: json['is_active'] != false,
    );
  }

  static double _toDouble(dynamic v) {
    if (v == null) return 0;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0;
  }
}

/// A student's grade within one course (from /students/:id/grades).
class StudentGradeModel {
  final int id;
  final int? courseId;
  final String? courseName;
  final int? gradeId;
  final String? gradeName;
  final double monthlyFee;

  const StudentGradeModel({
    required this.id,
    this.courseId,
    this.courseName,
    this.gradeId,
    this.gradeName,
    this.monthlyFee = 0,
  });

  factory StudentGradeModel.fromJson(Map<String, dynamic> json) {
    return StudentGradeModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      courseId: json['course_id'] as int?,
      courseName: json['course_name'] as String?,
      gradeId: json['grade_id'] as int?,
      gradeName: json['grade_name'] as String?,
      monthlyFee: GradeModel._toDouble(json['monthly_fee']),
    );
  }
}
