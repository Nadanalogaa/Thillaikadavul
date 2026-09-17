// Models for the admin fees roster, family dues, cash collection and
// receipts (`/api/fees/*`). Parsing is defensive: numbers may arrive as int,
// double or string, and optional fields may be missing.

double _num(dynamic v) {
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? 0;
  return 0;
}

double? _numOrNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v);
  return null;
}

int _int(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v) ?? 0;
  return 0;
}

String? _str(dynamic v) {
  if (v == null) return null;
  final s = v.toString().trim();
  return s.isEmpty ? null : s;
}

List<Map<String, dynamic>> _maps(dynamic v) => v is List
    ? v.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList()
    : const [];

/// Roster status values, in the order the filter chips show them.
class FeeStatus {
  FeeStatus._();
  static const paid = 'paid';
  static const pending = 'pending';
  static const overdue = 'overdue';
  static const partlyPaid = 'partly_paid';
  static const noBill = 'no_bill';
  static const notSetUp = 'not_set_up';

  static String label(String status) {
    switch (status) {
      case paid:
        return 'Paid';
      case pending:
        return 'Pending';
      case overdue:
        return 'Overdue';
      case partlyPaid:
        return 'Partly paid';
      case noBill:
        return 'No bill';
      case notSetUp:
        return 'Not set up';
      default:
        return status;
    }
  }
}

class FeeRosterSummary {
  final int students;
  final double billed;
  final double collected;
  final double outstanding;
  final Map<String, int> counts;

  const FeeRosterSummary({
    this.students = 0,
    this.billed = 0,
    this.collected = 0,
    this.outstanding = 0,
    this.counts = const {},
  });

  factory FeeRosterSummary.fromJson(Map<String, dynamic> j) {
    final c = j['counts'] is Map ? j['counts'] as Map : const {};
    return FeeRosterSummary(
      students: _int(j['students']),
      billed: _num(j['billed']),
      collected: _num(j['collected']),
      outstanding: _num(j['outstanding']),
      counts: {for (final e in c.entries) '${e.key}': _int(e.value)},
    );
  }

  int count(String status) => counts[status] ?? 0;
}

class FeeRosterGrade {
  final int? courseId;
  final String courseName;
  final String gradeName;
  final double monthlyFee;

  const FeeRosterGrade({
    this.courseId,
    required this.courseName,
    required this.gradeName,
    required this.monthlyFee,
  });

  factory FeeRosterGrade.fromJson(Map<String, dynamic> j) => FeeRosterGrade(
        courseId: j['course_id'] == null ? null : _int(j['course_id']),
        courseName: _str(j['course_name']) ?? '',
        gradeName: _str(j['grade_name']) ?? '',
        monthlyFee: _num(j['monthly_fee']),
      );
}

class FeeRosterBill {
  final int id;
  final String courseName;
  final double amount;
  final double? originalAmount;
  final double? discountPercentage;
  final String status; // paid | pending | overdue
  final String? dueDate;
  final String? proratedFrom;
  final String? receiptNumber;
  final String? paymentMethod;
  final String? paidAt;
  final String? collectedByName;

  const FeeRosterBill({
    required this.id,
    required this.courseName,
    required this.amount,
    this.originalAmount,
    this.discountPercentage,
    required this.status,
    this.dueDate,
    this.proratedFrom,
    this.receiptNumber,
    this.paymentMethod,
    this.paidAt,
    this.collectedByName,
  });

  factory FeeRosterBill.fromJson(Map<String, dynamic> j) => FeeRosterBill(
        id: _int(j['id']),
        courseName: _str(j['course_name']) ?? 'Fee',
        amount: _num(j['amount']),
        originalAmount: _numOrNull(j['original_amount']),
        discountPercentage: _numOrNull(j['discount_percentage']),
        status: (_str(j['status']) ?? FeeStatus.pending).toLowerCase(),
        dueDate: _str(j['due_date']),
        proratedFrom: _str(j['prorated_from']),
        receiptNumber: _str(j['receipt_number']),
        paymentMethod: _str(j['payment_method']),
        paidAt: _str(j['paid_at']),
        collectedByName: _str(j['collected_by_name']),
      );

  bool get isPaid => status == FeeStatus.paid;

  /// True when a discount brought the amount below the original.
  bool get isDiscounted =>
      originalAmount != null &&
      originalAmount! > amount &&
      (discountPercentage ?? 0) > 0;
}

class FeeRosterRow {
  final int studentId;
  final String name;
  final String? userId;
  final String? phone;
  final String? parentName;
  final bool inactive;
  final List<FeeRosterGrade> grades;
  final List<String> batchNames;
  final String status;
  final double billed;
  final double paid;
  final double due;
  final String? dueDate;
  final List<FeeRosterBill> bills;

  const FeeRosterRow({
    required this.studentId,
    required this.name,
    this.userId,
    this.phone,
    this.parentName,
    this.inactive = false,
    this.grades = const [],
    this.batchNames = const [],
    required this.status,
    this.billed = 0,
    this.paid = 0,
    this.due = 0,
    this.dueDate,
    this.bills = const [],
  });

  factory FeeRosterRow.fromJson(Map<String, dynamic> j) => FeeRosterRow(
        studentId: _int(j['student_id']),
        name: _str(j['name']) ?? 'Student',
        userId: _str(j['user_id']),
        phone: _str(j['phone']),
        parentName: _str(j['parent_name']),
        inactive: j['inactive'] == true,
        grades: _maps(j['grades']).map(FeeRosterGrade.fromJson).toList(),
        batchNames: j['batch_names'] is List
            ? (j['batch_names'] as List).map(_str).whereType<String>().toList()
            : const [],
        status: _str(j['status']) ?? FeeStatus.noBill,
        billed: _num(j['billed']),
        paid: _num(j['paid']),
        due: _num(j['due']),
        dueDate: _str(j['due_date']),
        bills: _maps(j['bills']).map(FeeRosterBill.fromJson).toList(),
      );

  List<FeeRosterBill> get unpaidBills => bills.where((b) => !b.isPaid).toList();

  bool get hasUnpaid =>
      status == FeeStatus.pending ||
      status == FeeStatus.overdue ||
      status == FeeStatus.partlyPaid;
}

class FeeRoster {
  final String period;
  final String? today;
  final FeeRosterSummary summary;
  final List<FeeRosterRow> rows;

  const FeeRoster({
    required this.period,
    this.today,
    required this.summary,
    required this.rows,
  });

  factory FeeRoster.fromJson(Map<String, dynamic> j) => FeeRoster(
        period: _str(j['period']) ?? '',
        today: _str(j['today']),
        summary: j['summary'] is Map
            ? FeeRosterSummary.fromJson(
                Map<String, dynamic>.from(j['summary'] as Map))
            : const FeeRosterSummary(),
        rows: _maps(j['rows']).map(FeeRosterRow.fromJson).toList(),
      );
}

class FamilyDueBill {
  final int id;
  final int? studentId;
  final String studentName;
  final String courseName;
  final String? billingPeriod;
  final double amount;
  final String? dueDate;
  final String? proratedFrom;
  final bool overdue;

  const FamilyDueBill({
    required this.id,
    this.studentId,
    required this.studentName,
    required this.courseName,
    this.billingPeriod,
    required this.amount,
    this.dueDate,
    this.proratedFrom,
    this.overdue = false,
  });

  factory FamilyDueBill.fromJson(Map<String, dynamic> j) => FamilyDueBill(
        id: _int(j['id']),
        studentId: j['student_id'] == null ? null : _int(j['student_id']),
        studentName: _str(j['student_name']) ?? 'Student',
        courseName: _str(j['course_name']) ?? 'Fee',
        billingPeriod: _str(j['billing_period']),
        amount: _num(j['amount']),
        dueDate: _str(j['due_date']),
        proratedFrom: _str(j['prorated_from']),
        overdue: j['overdue'] == true,
      );
}

class FamilyDue {
  final List<FamilyDueBill> bills;
  final double total;
  final String? notifyName;
  final String? notifyEmail;

  const FamilyDue({
    required this.bills,
    required this.total,
    this.notifyName,
    this.notifyEmail,
  });

  factory FamilyDue.fromJson(Map<String, dynamic> j) {
    final n = j['notify'] is Map
        ? Map<String, dynamic>.from(j['notify'] as Map)
        : const <String, dynamic>{};
    return FamilyDue(
      bills: _maps(j['bills']).map(FamilyDueBill.fromJson).toList(),
      total: _num(j['total']),
      notifyName: _str(n['name']),
      notifyEmail: _str(n['email']),
    );
  }
}

/// One settled bill on a receipt (also the shape of collect-cash `lines`).
class FeeReceiptLine {
  final int? invoiceId;
  final String studentName;
  final String courseName;
  final String? billingPeriod;
  final double amount;

  const FeeReceiptLine({
    this.invoiceId,
    required this.studentName,
    required this.courseName,
    this.billingPeriod,
    required this.amount,
  });

  factory FeeReceiptLine.fromJson(Map<String, dynamic> j) => FeeReceiptLine(
        invoiceId: j['invoice_id'] == null ? null : _int(j['invoice_id']),
        studentName: _str(j['student_name']) ?? 'Student',
        courseName: _str(j['course_name']) ?? 'Fee',
        billingPeriod: _str(j['billing_period']),
        amount: _num(j['amount']),
      );

  static List<FeeReceiptLine> listFrom(dynamic v) =>
      _maps(v).map(FeeReceiptLine.fromJson).toList();
}

class FeeReceipt {
  final String receiptNumber;
  final String status; // paid | reversed
  final String? method;
  final String? methodLabel;
  final String? transactionId;
  final String? paidAt;
  final String? collectedByName;
  final String? reversedAt;
  final String? reversedByName;
  final String? reversalReason;
  final List<FeeReceiptLine> lines;
  final double total;

  const FeeReceipt({
    required this.receiptNumber,
    required this.status,
    this.method,
    this.methodLabel,
    this.transactionId,
    this.paidAt,
    this.collectedByName,
    this.reversedAt,
    this.reversedByName,
    this.reversalReason,
    this.lines = const [],
    this.total = 0,
  });

  factory FeeReceipt.fromJson(Map<String, dynamic> j) => FeeReceipt(
        receiptNumber: _str(j['receipt_number']) ?? '',
        status: (_str(j['status']) ?? 'paid').toLowerCase(),
        method: _str(j['method']),
        methodLabel: _str(j['method_label']),
        transactionId: _str(j['transaction_id']),
        paidAt: _str(j['paid_at']),
        collectedByName: _str(j['collected_by_name']),
        reversedAt: _str(j['reversed_at']),
        reversedByName: _str(j['reversed_by_name']),
        reversalReason: _str(j['reversal_reason']),
        lines: FeeReceiptLine.listFrom(j['lines']),
        total: _num(j['total']),
      );

  bool get isReversed => status == 'reversed';
}

/// Pull the user-facing `message` out of a non-2xx response body.
String feeErrorMessage(dynamic data, String fallback) {
  if (data is Map && data['message'] != null) {
    final m = data['message'].toString().trim();
    if (m.isNotEmpty) return m;
  }
  return fallback;
}
