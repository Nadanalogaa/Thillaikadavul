class DemoBookingModel {
  final int id;
  final String? studentName;
  final String? parentName;
  final String? email;
  final String? phone;
  final String? course;
  final String? preferredDate;
  final String? preferredTime;
  final String? location;
  final String? notes;
  final String? status;
  final String? scheduledDate;
  final String? scheduledTime;
  final String? assignedTeacher;
  final String? createdAt;
  final String? updatedAt;

  const DemoBookingModel({
    required this.id,
    this.studentName,
    this.parentName,
    this.email,
    this.phone,
    this.course,
    this.preferredDate,
    this.preferredTime,
    this.location,
    this.notes,
    this.status,
    this.scheduledDate,
    this.scheduledTime,
    this.assignedTeacher,
    this.createdAt,
    this.updatedAt,
  });

  factory DemoBookingModel.fromJson(Map<String, dynamic> json) {
    return DemoBookingModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      studentName: json['student_name'] as String?,
      parentName: json['parent_name'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      course: json['course'] as String?,
      preferredDate: json['preferred_date'] as String?,
      preferredTime: json['preferred_time'] as String?,
      location: json['location'] as String?,
      notes: json['notes'] as String?,
      status: json['status'] as String?,
      scheduledDate: json['scheduled_date'] as String?,
      scheduledTime: json['scheduled_time'] as String?,
      assignedTeacher: json['assigned_teacher'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'student_name': studentName,
      'parent_name': parentName,
      'email': email,
      'phone': phone,
      'course': course,
      'preferred_date': preferredDate,
      'preferred_time': preferredTime,
      'location': location,
      'notes': notes,
    };
  }
}
