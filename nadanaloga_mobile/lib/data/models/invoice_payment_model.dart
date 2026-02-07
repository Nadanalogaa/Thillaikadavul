class InvoicePaymentModel {
  final int id;
  final int invoiceId;
  final int? studentId;
  final double? amount;
  final String? paymentMethod;
  final String? transactionId;
  final String? paymentDate;
  final String? proofUrl;
  final String status;
  final String? notes;
  final String? submittedAt;
  final String? approvedAt;

  // Joined fields for admin listing
  final String? studentName;
  final String? studentEmail;
  final String? courseName;
  final double? invoiceAmount;
  final String? currency;
  final String? invoiceStatus;

  const InvoicePaymentModel({
    required this.id,
    required this.invoiceId,
    this.studentId,
    this.amount,
    this.paymentMethod,
    this.transactionId,
    this.paymentDate,
    this.proofUrl,
    this.status = 'submitted',
    this.notes,
    this.submittedAt,
    this.approvedAt,
    this.studentName,
    this.studentEmail,
    this.courseName,
    this.invoiceAmount,
    this.currency,
    this.invoiceStatus,
  });

  factory InvoicePaymentModel.fromJson(Map<String, dynamic> json) {
    return InvoicePaymentModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      invoiceId: json['invoice_id'] is int
          ? json['invoice_id']
          : int.parse(json['invoice_id'].toString()),
      studentId: json['student_id'] as int?,
      amount: _parseDouble(json['amount']),
      paymentMethod: json['payment_method'] as String?,
      transactionId: json['transaction_id'] as String?,
      paymentDate: json['payment_date'] as String?,
      proofUrl: json['proof_url'] as String?,
      status: json['status'] ?? 'submitted',
      notes: json['notes'] as String?,
      submittedAt: json['submitted_at'] as String?,
      approvedAt: json['approved_at'] as String?,
      studentName: json['student_name'] as String?,
      studentEmail: json['student_email'] as String?,
      courseName: json['course_name'] as String?,
      invoiceAmount: _parseDouble(json['invoice_amount']),
      currency: json['currency'] as String?,
      invoiceStatus: json['invoice_status'] as String?,
    );
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }
}
