class InvoiceModel {
  final int id;
  final int? studentId;
  final int? feeStructureId;
  final String? courseName;
  final double? amount;
  final String? currency;
  final String? issueDate;
  final String? dueDate;
  final String? billingPeriod;
  final String status;
  final Map<String, dynamic>? paymentDetails;
  final String? studentName;
  final String? studentEmail;
  final String? createdAt;
  final String? updatedAt;

  const InvoiceModel({
    required this.id,
    this.studentId,
    this.feeStructureId,
    this.courseName,
    this.amount,
    this.currency,
    this.issueDate,
    this.dueDate,
    this.billingPeriod,
    this.status = 'pending',
    this.paymentDetails,
    this.studentName,
    this.studentEmail,
    this.createdAt,
    this.updatedAt,
  });

  factory InvoiceModel.fromJson(Map<String, dynamic> json) {
    return InvoiceModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      studentId: json['student_id'] as int?,
      feeStructureId: json['fee_structure_id'] as int?,
      courseName: json['course_name'] as String?,
      amount: _parseDouble(json['amount']),
      currency: json['currency'] as String?,
      issueDate: json['issue_date'] as String?,
      dueDate: json['due_date'] as String?,
      billingPeriod: json['billing_period'] as String?,
      status: json['status'] ?? 'pending',
      paymentDetails: json['payment_details'] is Map<String, dynamic>
          ? json['payment_details']
          : null,
      studentName: json['student_name'] as String?,
      studentEmail: json['student_email'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'student_id': studentId,
      'fee_structure_id': feeStructureId,
      'course_name': courseName,
      'amount': amount,
      'currency': currency,
      'issue_date': issueDate,
      'due_date': dueDate,
      'billing_period': billingPeriod,
      'status': status,
      'payment_details': paymentDetails,
    };
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  String? get paymentMethod => paymentDetails?['payment_method'] as String?;
  String? get transactionId => paymentDetails?['transaction_id'] as String?;
  String? get paymentDate => paymentDetails?['payment_date'] as String?;

  bool get isPending => status == 'pending';
  bool get isPaid => status == 'paid';
  bool get isOverdue => status == 'overdue';
}
