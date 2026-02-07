class SalaryModel {
  final int id;
  final int? userId;
  final String? role;
  final double? baseSalary;
  final String? paymentFrequency;
  final String? bankAccountName;
  final String? bankAccountNumber;
  final String? bankIfsc;
  final String? upiId;
  final String? employeeName;
  final String? employeeEmail;
  final String? employeeRole;
  final String? createdAt;
  final String? updatedAt;

  const SalaryModel({
    required this.id,
    this.userId,
    this.role,
    this.baseSalary,
    this.paymentFrequency,
    this.bankAccountName,
    this.bankAccountNumber,
    this.bankIfsc,
    this.upiId,
    this.employeeName,
    this.employeeEmail,
    this.employeeRole,
    this.createdAt,
    this.updatedAt,
  });

  factory SalaryModel.fromJson(Map<String, dynamic> json) {
    return SalaryModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      userId: json['user_id'] as int?,
      role: json['role'] as String?,
      baseSalary: _parseDouble(json['base_salary']),
      paymentFrequency: json['payment_frequency'] as String?,
      bankAccountName: json['bank_account_name'] as String?,
      bankAccountNumber: json['bank_account_number'] as String?,
      bankIfsc: json['bank_ifsc'] as String?,
      upiId: json['upi_id'] as String?,
      employeeName: json['employee_name'] as String?,
      employeeEmail: json['employee_email'] as String?,
      employeeRole: json['employee_role'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'role': role,
      'base_salary': baseSalary,
      'payment_frequency': paymentFrequency,
      'bank_account_name': bankAccountName,
      'bank_account_number': bankAccountNumber,
      'bank_ifsc': bankIfsc,
      'upi_id': upiId,
    };
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }
}
