class StudentDiscountModel {
  final int id;
  final int studentId;
  final String discountType; // 'course' or 'batch'
  final int courseId;
  final int? batchId; // null for course-level discounts
  final double discountPercentage;
  final String? reason;
  final bool isActive;
  final String? createdAt;
  final String? updatedAt;

  const StudentDiscountModel({
    required this.id,
    required this.studentId,
    required this.discountType,
    required this.courseId,
    this.batchId,
    required this.discountPercentage,
    this.reason,
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  factory StudentDiscountModel.fromJson(Map<String, dynamic> json) {
    return StudentDiscountModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      studentId: json['student_id'] is int
          ? json['student_id']
          : int.parse(json['student_id'].toString()),
      discountType: json['discount_type'] as String,
      courseId: json['course_id'] is int
          ? json['course_id']
          : int.parse(json['course_id'].toString()),
      batchId: json['batch_id'] != null
          ? (json['batch_id'] is int
              ? json['batch_id']
              : int.parse(json['batch_id'].toString()))
          : null,
      discountPercentage: _parseDouble(json['discount_percentage']) ?? 0.0,
      reason: json['reason'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'student_id': studentId,
      'discount_type': discountType,
      'course_id': courseId,
      'batch_id': batchId,
      'discount_percentage': discountPercentage,
      'reason': reason,
      'is_active': isActive,
    };
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  /// Calculate discounted amount from base fee
  double applyDiscount(double baseFee) {
    return baseFee * (1 - discountPercentage / 100);
  }

  /// Get discount display text
  String get discountText => '${discountPercentage.toStringAsFixed(0)}% off';

  /// Get discount type display text
  String get typeDisplay => discountType == 'course' ? 'Course-level' : 'Batch-level';
}
