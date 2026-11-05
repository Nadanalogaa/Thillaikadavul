import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';

// Data shapes and small helpers shared by the expenses screens.

num _num(dynamic v) => v is num ? v : num.tryParse('${v ?? ''}') ?? 0;
int? _int(dynamic v) => v is int ? v : int.tryParse('${v ?? ''}');
String? _str(dynamic v) {
  final s = v?.toString().trim() ?? '';
  return s.isEmpty || s == 'null' ? null : s;
}

class ExpenseRow {
  final int id;
  final String date; // YYYY-MM-DD
  final String category;
  final String particulars;
  final num amount;
  final String? paidTo;
  final String? paymentMode;
  final int? locationId;
  final String? locationName;
  final int? teacherId;
  final String? teacherName;
  final String? forMonth;
  final String? referenceNo;
  final String? referenceUrl;
  final String? referenceName;
  final String? notes;
  final String? createdByName;
  final String? createdAt;
  final String? updatedByName;
  final String? updatedAt;

  const ExpenseRow({
    required this.id,
    required this.date,
    required this.category,
    required this.particulars,
    required this.amount,
    this.paidTo,
    this.paymentMode,
    this.locationId,
    this.locationName,
    this.teacherId,
    this.teacherName,
    this.forMonth,
    this.referenceNo,
    this.referenceUrl,
    this.referenceName,
    this.notes,
    this.createdByName,
    this.createdAt,
    this.updatedByName,
    this.updatedAt,
  });

  factory ExpenseRow.fromJson(Map<String, dynamic> j) => ExpenseRow(
        id: _int(j['id']) ?? 0,
        date: '${j['expense_date'] ?? ''}'.split('T').first,
        category: _str(j['category']) ?? 'Miscellaneous',
        particulars: _str(j['particulars']) ?? '',
        amount: _num(j['amount']),
        paidTo: _str(j['paid_to']),
        paymentMode: _str(j['payment_mode']),
        locationId: _int(j['location_id']),
        locationName: _str(j['location_name']),
        teacherId: _int(j['teacher_id']),
        teacherName: _str(j['teacher_name']),
        forMonth: _str(j['for_month']),
        referenceNo: _str(j['reference_no']),
        referenceUrl: _str(j['reference_url']),
        referenceName: _str(j['reference_name']),
        notes: _str(j['notes']),
        createdByName: _str(j['created_by_name']),
        createdAt: _str(j['created_at']),
        updatedByName: _str(j['updated_by_name']),
        updatedAt: _str(j['updated_at']),
      );
}

class IdName {
  final int id;
  final String name;
  const IdName(this.id, this.name);
}

/// A recurring cost paid recently but not yet this month.
class DueExpense {
  final String category;
  final int? locationId;
  final String? locationName;
  final int? teacherId;
  final String? teacherName;
  final String? paidTo;
  final num amount;
  final String? particulars;
  final String? paymentMode;
  final String? lastMonth;

  const DueExpense({
    required this.category,
    this.locationId,
    this.locationName,
    this.teacherId,
    this.teacherName,
    this.paidTo,
    required this.amount,
    this.particulars,
    this.paymentMode,
    this.lastMonth,
  });

  factory DueExpense.fromJson(Map<String, dynamic> j) => DueExpense(
        category: _str(j['category']) ?? '',
        locationId: _int(j['location_id']),
        locationName: _str(j['location_name']),
        teacherId: _int(j['teacher_id']),
        teacherName: _str(j['teacher_name']),
        paidTo: _str(j['paid_to']),
        amount: _num(j['amount']),
        particulars: _str(j['particulars']),
        paymentMode: _str(j['payment_mode']),
        lastMonth: _str(j['last_month']) ?? _str(j['month']),
      );
}

/// One past expense (last 13 months), used to prefill and to warn about
/// paying the same teacher twice for a month.
class ExpenseHistory {
  final int id;
  final String category;
  final int? locationId;
  final int? teacherId;
  final String? paidTo;
  final num amount;
  final String? paymentMode;
  final String? forMonth; // YYYY-MM
  final String date; // YYYY-MM-DD

  const ExpenseHistory({
    required this.id,
    required this.category,
    this.locationId,
    this.teacherId,
    this.paidTo,
    required this.amount,
    this.paymentMode,
    this.forMonth,
    required this.date,
  });

  /// The month this payment covers: its for-month, else the month paid.
  String get month => forMonth ?? (date.length >= 7 ? date.substring(0, 7) : date);

  factory ExpenseHistory.fromJson(Map<String, dynamic> j) => ExpenseHistory(
        id: _int(j['id']) ?? 0,
        category: _str(j['category']) ?? '',
        locationId: _int(j['location_id']),
        teacherId: _int(j['teacher_id']),
        paidTo: _str(j['paid_to']),
        amount: _num(j['amount']),
        paymentMode: _str(j['payment_mode']),
        forMonth: _str(j['for_month']),
        date: '${j['expense_date'] ?? ''}'.split('T').first,
      );
}

/// What a category needs on the form.
enum ExpenseKind { salary, rent, utility, travel, snacks, purchase, other }

ExpenseKind expenseKindOf(String category) {
  bool m(String re) => RegExp(re, caseSensitive: false).hasMatch(category);
  if (m(r'teacher|salary')) return ExpenseKind.salary;
  if (m(r'^rent')) return ExpenseKind.rent;
  if (m(r'electric|water|internet|phone')) return ExpenseKind.utility;
  if (m(r'travel|convey')) return ExpenseKind.travel;
  if (m(r'tea|snack')) return ExpenseKind.snacks;
  if (m(r'material|suppl|costume|prop|procure|equip|repair|print|market|software|house')) {
    return ExpenseKind.purchase;
  }
  return ExpenseKind.other;
}

class ExpenseMeta {
  final List<String> categories;
  final List<String> recurring;
  final List<String> paymentModes;
  final List<IdName> locations;
  final List<IdName> teachers;
  final List<String> paidTo;
  final List<DueExpense> due;
  final List<ExpenseHistory> history; // newest first
  final String thisMonth;

  const ExpenseMeta({
    required this.categories,
    required this.recurring,
    required this.paymentModes,
    required this.locations,
    required this.teachers,
    required this.paidTo,
    required this.due,
    this.history = const [],
    required this.thisMonth,
  });

  static List<String> _strings(dynamic v) =>
      v is List ? v.map((e) => '$e').where((e) => e.isNotEmpty).toList() : const [];
  static List<IdName> _idNames(dynamic v) => v is List
      ? v
          .whereType<Map>()
          .map((e) => IdName(_int(e['id']) ?? 0, '${e['name'] ?? ''}'))
          .where((e) => e.id != 0)
          .toList()
      : const [];

  factory ExpenseMeta.fromJson(Map<String, dynamic> j) => ExpenseMeta(
        categories: _strings(j['categories']),
        recurring: _strings(j['recurring']),
        paymentModes: _strings(j['payment_modes']),
        locations: _idNames(j['locations']),
        teachers: _idNames(j['teachers']),
        paidTo: _strings(j['paid_to']),
        due: j['due'] is List
            ? (j['due'] as List)
                .whereType<Map>()
                .map((e) => DueExpense.fromJson(Map<String, dynamic>.from(e)))
                .toList()
            : const [],
        history: j['history'] is List
            ? (j['history'] as List)
                .whereType<Map>()
                .map((e) => ExpenseHistory.fromJson(Map<String, dynamic>.from(e)))
                .toList()
            : const [],
        thisMonth: _str(j['this_month']) ?? ExpenseDates.monthKey(DateTime.now()),
      );

  bool isRecurring(String category) => recurring.contains(category);

  /// The teacher-salary category ("Teacher fees / salary").
  String get salaryCategory => categories.firstWhere(
      (c) => expenseKindOf(c) == ExpenseKind.salary,
      orElse: () => 'Teacher fees / salary');
}

/// "key" / total / count rows of the summary breakdowns.
class Bucket {
  final String key;
  final num total;
  final int count;
  const Bucket(this.key, this.total, this.count);

  static List<Bucket> list(dynamic v, {String keyField = 'key'}) => v is List
      ? v
          .whereType<Map>()
          .map((e) => Bucket('${e[keyField] ?? ''}', _num(e['total']),
              _int(e['count']) ?? 0))
          .toList()
      : const [];
}

class ExpenseDates {
  ExpenseDates._();

  static const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  static const monthsLong = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  static String _pad(int n) => n.toString().padLeft(2, '0');
  static String ymd(DateTime d) => '${d.year}-${_pad(d.month)}-${_pad(d.day)}';
  static String monthKey(DateTime d) => '${d.year}-${_pad(d.month)}';

  static DateTime? parseYmd(String? s) {
    final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(s ?? '');
    if (m == null) return null;
    return DateTime(int.parse(m.group(1)!), int.parse(m.group(2)!),
        int.parse(m.group(3)!));
  }

  static DateTime? parseMonth(String? s) {
    final m = RegExp(r'^(\d{4})-(\d{2})').firstMatch(s ?? '');
    if (m == null) return null;
    return DateTime(int.parse(m.group(1)!), int.parse(m.group(2)!));
  }

  /// "Oct" from "2026-10".
  static String monthShort(String? key) {
    final d = parseMonth(key);
    return d == null ? (key ?? '') : monthsShort[d.month - 1];
  }

  /// "Oct 2026" from "2026-10".
  static String monthLabel(String? key) {
    final d = parseMonth(key);
    return d == null ? (key ?? '') : '${monthsShort[d.month - 1]} ${d.year}';
  }

  /// "November 2026".
  static String monthLong(DateTime d) => '${monthsLong[d.month - 1]} ${d.year}';

  /// "November 2026" from "2026-11".
  static String monthLongKey(String? key) {
    final d = parseMonth(key);
    return d == null ? (key ?? '') : monthLong(d);
  }

  /// "Tue, 4 Nov 2026".
  static String dayHeading(String ymdStr) {
    final d = parseYmd(ymdStr);
    if (d == null) return ymdStr;
    const w = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return '${w[d.weekday - 1]}, ${d.day} ${monthsShort[d.month - 1]} ${d.year}';
  }

  static String short(DateTime d) =>
      '${d.day} ${monthsShort[d.month - 1]} ${d.year}';
}

IconData expenseIcon(String category) {
  final c = category.toLowerCase();
  if (c.startsWith('teacher')) return Icons.school_outlined;
  if (c.contains('rent')) return Icons.home_work_outlined;
  if (c.contains('electric')) return Icons.bolt_outlined;
  if (c.contains('water')) return Icons.water_drop_outlined;
  if (c.contains('internet') || c.contains('phone')) return Icons.wifi;
  if (c.contains('travel')) return Icons.directions_car_outlined;
  if (c.contains('material')) return Icons.inventory_2_outlined;
  if (c.contains('costume')) return Icons.checkroom_outlined;
  if (c.contains('tea') || c.contains('snack')) return Icons.local_cafe_outlined;
  if (c.contains('procure') || c.contains('equipment')) return Icons.shopping_cart_outlined;
  if (c.contains('repair')) return Icons.build_outlined;
  if (c.contains('event')) return Icons.celebration_outlined;
  if (c.contains('print') || c.contains('marketing')) return Icons.campaign_outlined;
  if (c.contains('software')) return Icons.cloud_outlined;
  if (c.contains('bank')) return Icons.account_balance_outlined;
  if (c.contains('housekeep')) return Icons.cleaning_services_outlined;
  return Icons.receipt_outlined;
}

Color expenseColor(String category) => AppColors.getCourseColor(category);

/// A thin horizontal bar, [fraction] of the available width filled.
class ExpenseBar extends StatelessWidget {
  final double fraction;
  final Color color;
  final double height;
  const ExpenseBar(
      {super.key, required this.fraction, required this.color, this.height = 6});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(height),
      child: Stack(
        children: [
          Container(height: height, color: color.withValues(alpha: 0.12)),
          FractionallySizedBox(
            widthFactor: fraction.isNaN ? 0 : fraction.clamp(0.0, 1.0),
            child: Container(height: height, color: color),
          ),
        ],
      ),
    );
  }
}

/// Error panel with a Retry button, used by the admin money screens.
class RetryPanel extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const RetryPanel({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined,
                size: 44, color: AppColors.textHint),
            const SizedBox(height: 10),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
