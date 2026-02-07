class SalaryPaymentModel {
  final int id;
  final int? salaryId;
  final int? userId;
  final double? amount;
  final String? paymentDate;
  final String? paymentMethod;
  final String? transactionId;
  final String? paymentPeriod;
  final String? notes;
  final String status;
  final String? employeeName;
  final String? employeeEmail;
  final String? createdAt;
  final String? updatedAt;

  const SalaryPaymentModel({
    required this.id,
    this.salaryId,
    this.userId,
    this.amount,
    this.paymentDate,
    this.paymentMethod,
    this.transactionId,
    this.paymentPeriod,
    this.notes,
    this.status = 'paid',
    this.employeeName,
    this.employeeEmail,
    this.createdAt,
    this.updatedAt,
  });

  factory SalaryPaymentModel.fromJson(Map<String, dynamic> json) {
    return SalaryPaymentModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      salaryId: json['salary_id'] as int?,
      userId: json['user_id'] as int?,
      amount: _parseDouble(json['amount']),
      paymentDate: json['payment_date'] as String?,
      paymentMethod: json['payment_method'] as String?,
      transactionId: json['transaction_id'] as String?,
      paymentPeriod: json['payment_period'] as String?,
      notes: json['notes'] as String?,
      status: json['status'] ?? 'paid',
      employeeName: json['employee_name'] as String?,
      employeeEmail: json['employee_email'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'salary_id': salaryId,
      'user_id': userId,
      'amount': amount,
      'payment_date': paymentDate,
      'payment_method': paymentMethod,
      'transaction_id': transactionId,
      'payment_period': paymentPeriod,
      'notes': notes,
      'status': status,
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
