class GradeExamModel {
  final int id;
  final String examName;
  final String? course;
  final String? examDate;
  final String? examTime;
  final String? location;
  final String? syllabus;
  final List<int>? recipientIds;
  final String? createdAt;
  final String? updatedAt;

  const GradeExamModel({
    required this.id,
    required this.examName,
    this.course,
    this.examDate,
    this.examTime,
    this.location,
    this.syllabus,
    this.recipientIds,
    this.createdAt,
    this.updatedAt,
  });

  factory GradeExamModel.fromJson(Map<String, dynamic> json) {
    return GradeExamModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      examName: json['exam_name'] ?? '',
      course: json['course'] as String?,
      examDate: json['exam_date'] as String?,
      examTime: json['exam_time'] as String?,
      location: json['location'] as String?,
      syllabus: json['syllabus'] as String?,
      recipientIds: json['recipient_ids'] != null
          ? List<int>.from(json['recipient_ids'])
          : null,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'exam_name': examName,
      'course': course,
      'exam_date': examDate,
      'exam_time': examTime,
      'location': location,
      'syllabus': syllabus,
      'recipient_ids': recipientIds,
    };
  }
}
