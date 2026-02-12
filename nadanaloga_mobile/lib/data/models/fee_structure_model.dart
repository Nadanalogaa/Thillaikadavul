class FeeStructureModel {
  final int id;
  final int? courseId;
  final String? mode;
  final double? monthlyFee;
  final double? quarterlyFee;
  final double? halfYearlyFee;
  final double? annualFee;
  final List<int> batchIds;
  final String? createdAt;
  final String? updatedAt;

  const FeeStructureModel({
    required this.id,
    this.courseId,
    this.mode,
    this.monthlyFee,
    this.quarterlyFee,
    this.halfYearlyFee,
    this.annualFee,
    this.batchIds = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory FeeStructureModel.fromJson(Map<String, dynamic> json) {
    return FeeStructureModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      courseId: json['course_id'] as int?,
      mode: json['mode'] as String?,
      monthlyFee: _parseDouble(json['monthly_fee']),
      quarterlyFee: _parseDouble(json['quarterly_fee']),
      halfYearlyFee: _parseDouble(json['half_yearly_fee']),
      annualFee: _parseDouble(json['annual_fee']),
      batchIds: _parseIntList(json['batch_ids']),
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'course_id': courseId,
      'mode': mode,
      'monthly_fee': monthlyFee,
      'quarterly_fee': quarterlyFee,
      'half_yearly_fee': halfYearlyFee,
      'annual_fee': annualFee,
      'batch_ids': batchIds,
    };
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  static List<int> _parseIntList(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      return value.map((e) => e is int ? e : int.parse(e.toString())).toList();
    }
    return [];
  }
}
