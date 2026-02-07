class BatchScheduleEntry {
  final String? timing;
  final List<int> studentIds;

  const BatchScheduleEntry({
    this.timing,
    this.studentIds = const [],
  });

  factory BatchScheduleEntry.fromJson(Map<String, dynamic> json) {
    return BatchScheduleEntry(
      timing: json['timing'] as String?,
      studentIds: (json['studentIds'] as List<dynamic>?)
              ?.map((e) => e is int ? e : int.parse(e.toString()))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'timing': timing,
      'studentIds': studentIds,
    };
  }
}

class BatchModel {
  final int id;
  final String batchName;
  final int? courseId;
  final int? teacherId;
  final List<BatchScheduleEntry> schedule;
  final String? startDate;
  final String? endDate;
  final int? maxStudents;
  final List<int> studentIds;
  final String? mode;
  final int? locationId;
  final String? createdAt;
  final String? updatedAt;

  const BatchModel({
    required this.id,
    required this.batchName,
    this.courseId,
    this.teacherId,
    this.schedule = const [],
    this.startDate,
    this.endDate,
    this.maxStudents,
    this.studentIds = const [],
    this.mode,
    this.locationId,
    this.createdAt,
    this.updatedAt,
  });

  factory BatchModel.fromJson(Map<String, dynamic> json) {
    return BatchModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      batchName: json['batch_name'] ?? '',
      courseId: json['course_id'] as int?,
      teacherId: json['teacher_id'] as int?,
      schedule: _parseSchedule(json['schedule']),
      startDate: json['start_date'] as String?,
      endDate: json['end_date'] as String?,
      maxStudents: json['max_students'] as int?,
      studentIds: _parseIntList(json['student_ids']),
      mode: json['mode'] as String?,
      locationId: json['location_id'] as int?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'batch_name': batchName,
      'course_id': courseId,
      'teacher_id': teacherId,
      'schedule': schedule.map((e) => e.toJson()).toList(),
      'start_date': startDate,
      'end_date': endDate,
      'max_students': maxStudents,
      'student_ids': studentIds,
      'mode': mode,
      'location_id': locationId,
    };
  }

  static List<BatchScheduleEntry> _parseSchedule(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      return value.map((e) {
        if (e is Map<String, dynamic>) {
          return BatchScheduleEntry.fromJson(e);
        }
        return const BatchScheduleEntry();
      }).toList();
    }
    return [];
  }

  static List<int> _parseIntList(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      return value.map((e) => e is int ? e : int.parse(e.toString())).toList();
    }
    return [];
  }

  /// Get all student IDs from both top-level and schedule entries
  List<int> get allStudentIds {
    final ids = <int>{...studentIds};
    for (final entry in schedule) {
      ids.addAll(entry.studentIds);
    }
    return ids.toList();
  }
}
