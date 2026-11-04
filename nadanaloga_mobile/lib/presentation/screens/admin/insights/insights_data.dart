import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../di/injection_container.dart';

// The admin "needs attention" data (GET /api/admin/insights) and the small
// pieces the three insight screens share.

int _int(dynamic v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}') ?? 0;
int? _intOrNull(dynamic v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}');
num _num(dynamic v) => v is num ? v : num.tryParse('${v ?? ''}') ?? 0;
String? _str(dynamic v) {
  final s = v?.toString().trim();
  return (s == null || s.isEmpty) ? null : s;
}

List<Map<String, dynamic>> _maps(dynamic v) => v is List
    ? v.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList()
    : const [];

class AttendanceInsightRow {
  final int studentId;
  final String name;
  final String? userId;
  final String? phone;
  final String? parentName;
  final int? batchId;
  final String? batchName;
  final String? courseName;
  final String? teacherName;
  final int classes;
  final int attended;
  final int absent;
  final num percentage;
  final int missedInARow;
  final String? lastAttended; // YYYY-MM-DD

  const AttendanceInsightRow({
    required this.studentId,
    required this.name,
    this.userId,
    this.phone,
    this.parentName,
    this.batchId,
    this.batchName,
    this.courseName,
    this.teacherName,
    required this.classes,
    required this.attended,
    required this.absent,
    required this.percentage,
    required this.missedInARow,
    this.lastAttended,
  });

  factory AttendanceInsightRow.fromJson(Map<String, dynamic> j) =>
      AttendanceInsightRow(
        studentId: _int(j['student_id']),
        name: _str(j['name']) ?? 'Student',
        userId: _str(j['user_id']),
        phone: _str(j['phone']),
        parentName: _str(j['parent_name']),
        batchId: _intOrNull(j['batch_id']),
        batchName: _str(j['batch_name']),
        courseName: _str(j['course_name']),
        teacherName: _str(j['teacher_name']),
        classes: _int(j['classes']),
        attended: _int(j['attended']),
        absent: _int(j['absent']),
        percentage: _num(j['percentage']),
        missedInARow: _int(j['missed_in_a_row']),
        lastAttended: _str(j['last_attended']),
      );
}

class AttendanceInsights {
  final int days;
  final int threshold;
  final int count;
  final List<AttendanceInsightRow> students;

  const AttendanceInsights({
    required this.days,
    required this.threshold,
    required this.count,
    required this.students,
  });

  factory AttendanceInsights.fromJson(Map<String, dynamic> j) {
    final rows = _maps(j['students']).map(AttendanceInsightRow.fromJson).toList();
    return AttendanceInsights(
      days: _int(j['days']),
      threshold: _int(j['threshold']),
      count: j['count'] == null ? rows.length : _int(j['count']),
      students: rows,
    );
  }
}

class FeeInsightRow {
  final int studentId;
  final String name;
  final String? userId;
  final String? phone;
  final String? parentName;
  final num amount;
  final num overdueAmount;
  final int bills;
  final num verifying;

  const FeeInsightRow({
    required this.studentId,
    required this.name,
    this.userId,
    this.phone,
    this.parentName,
    required this.amount,
    required this.overdueAmount,
    required this.bills,
    required this.verifying,
  });

  factory FeeInsightRow.fromJson(Map<String, dynamic> j) => FeeInsightRow(
        studentId: _int(j['student_id']),
        name: _str(j['name']) ?? 'Student',
        userId: _str(j['user_id']),
        phone: _str(j['phone']),
        parentName: _str(j['parent_name']),
        amount: _num(j['amount']),
        overdueAmount: _num(j['overdue_amount']),
        bills: _int(j['bills']),
        verifying: _num(j['verifying']),
      );
}

class FeeInsights {
  final String period;
  final num billed;
  final num collected;
  final num due;
  final int dueStudents;
  final num overdue;
  final int overdueStudents;
  final num verifying;
  final int verifyingBills;
  final num olderDue;
  final int olderBills;
  final List<FeeInsightRow> students;

  const FeeInsights({
    required this.period,
    required this.billed,
    required this.collected,
    required this.due,
    required this.dueStudents,
    required this.overdue,
    required this.overdueStudents,
    required this.verifying,
    required this.verifyingBills,
    required this.olderDue,
    required this.olderBills,
    required this.students,
  });

  factory FeeInsights.fromJson(Map<String, dynamic> j) => FeeInsights(
        period: _str(j['period']) ?? 'This month',
        billed: _num(j['billed']),
        collected: _num(j['collected']),
        due: _num(j['due']),
        dueStudents: _int(j['due_students']),
        overdue: _num(j['overdue']),
        overdueStudents: _int(j['overdue_students']),
        verifying: _num(j['verifying']),
        verifyingBills: _int(j['verifying_bills']),
        olderDue: _num(j['older_due']),
        olderBills: _int(j['older_bills']),
        students: _maps(j['students']).map(FeeInsightRow.fromJson).toList(),
      );
}

class BatchRef {
  final int id;
  final String name;
  const BatchRef(this.id, this.name);
}

class NotInBatchRow {
  final int studentId;
  final String name;
  final String? userId;
  final String? phone;
  final String? parentName;
  final int? courseId;
  final String? courseName;
  final String? gradeName;
  final List<BatchRef> batches;

  const NotInBatchRow({
    required this.studentId,
    required this.name,
    this.userId,
    this.phone,
    this.parentName,
    this.courseId,
    this.courseName,
    this.gradeName,
    this.batches = const [],
  });

  factory NotInBatchRow.fromJson(Map<String, dynamic> j) => NotInBatchRow(
        studentId: _int(j['student_id']),
        name: _str(j['name']) ?? 'Student',
        userId: _str(j['user_id']),
        phone: _str(j['phone']),
        parentName: _str(j['parent_name']),
        courseId: _intOrNull(j['course_id']),
        courseName: _str(j['course_name']),
        gradeName: _str(j['grade_name']),
        batches: _maps(j['batches'])
            .map((b) => BatchRef(_int(b['id']), _str(b['name']) ?? 'Batch'))
            .where((b) => b.id > 0)
            .toList(),
      );
}

class NotInBatchInsights {
  final int count;
  final int studentsCount;
  final List<NotInBatchRow> students;

  const NotInBatchInsights({
    required this.count,
    required this.studentsCount,
    required this.students,
  });

  factory NotInBatchInsights.fromJson(Map<String, dynamic> j) {
    final rows = _maps(j['students']).map(NotInBatchRow.fromJson).toList();
    return NotInBatchInsights(
      count: j['count'] == null ? rows.length : _int(j['count']),
      studentsCount: j['students_count'] == null
          ? rows.map((r) => r.studentId).toSet().length
          : _int(j['students_count']),
      students: rows,
    );
  }
}

/// A person row shared by several sections (joiners, leavers, birthdays).
class InsightPerson {
  final int studentId;
  final String name;
  final String? userId;
  final String? phone;
  final String? parentName;
  final Map<String, dynamic> raw;

  InsightPerson(this.raw)
      : studentId = _int(raw['student_id']),
        name = _str(raw['name']) ?? 'Student',
        userId = _str(raw['user_id']),
        phone = _str(raw['phone']),
        parentName = _str(raw['parent_name']);

  String? s(String k) => _str(raw[k]);
  int i(String k) => _int(raw[k]);
  bool b(String k) => raw[k] == true;
}

/// A class (batch on a date) from the "unmarked" and "today" sections.
class InsightClass {
  final int batchId;
  final String batchName;
  final String? courseName;
  final String? teacherName;
  final String? date; // YYYY-MM-DD (unmarked only)
  final String? startTime; // HH:MM
  final String? endTime;
  final int students;
  final String? state; // today: upcoming|running|not_marked|marked|cancelled

  InsightClass(Map<String, dynamic> j)
      : batchId = _int(j['batch_id']),
        batchName = _str(j['batch_name']) ?? 'Batch',
        courseName = _str(j['course_name']),
        teacherName = _str(j['teacher_name']),
        date = _str(j['date']),
        startTime = _str(j['start_time']),
        endTime = _str(j['end_time']),
        students = _int(j['students']),
        state = _str(j['state']);

  String get timeLabel {
    final a = insightTime(startTime);
    final b = insightTime(endTime);
    if (a.isEmpty) return '';
    return b.isEmpty ? a : '$a – $b';
  }
}

class TodayInsights {
  final String? date;
  final String? weekday;
  final String? now;
  final List<InsightClass> classes;
  TodayInsights(Map<String, dynamic> j)
      : date = _str(j['date']),
        weekday = _str(j['weekday']),
        now = _str(j['now']),
        classes = _maps(j['classes']).map(InsightClass.new).toList();
}

class UnmarkedInsights {
  final int count;
  final List<InsightClass> classes;
  UnmarkedInsights(Map<String, dynamic> j)
      : classes = _maps(j['classes']).map(InsightClass.new).toList(),
        count = j['count'] == null
            ? _maps(j['classes']).length
            : _int(j['count']);
}

class JoinerInsights {
  final String month;
  final int count;
  final int feeNotSet;
  final List<InsightPerson> students;
  final List<InsightPerson> leavers;
  JoinerInsights(Map<String, dynamic> j)
      : month = _str(j['month']) ?? 'This month',
        count = _int(j['count']),
        feeNotSet = _int(j['fee_not_set']),
        students = _maps(j['students']).map(InsightPerson.new).toList(),
        leavers = _maps(j['leavers']).map(InsightPerson.new).toList();
}

class BirthdayInsights {
  final int count;
  final List<InsightPerson> students;
  BirthdayInsights(Map<String, dynamic> j)
      : count = _int(j['count']),
        students = _maps(j['students']).map(InsightPerson.new).toList();
}

class DemoInsightRow {
  final int id;
  final String studentName;
  final String? parentName;
  final String? phone;
  final String? course;
  final String? asked;
  final String? preferredDate;
  final bool stale;
  DemoInsightRow(Map<String, dynamic> j)
      : id = _int(j['id']),
        studentName = _str(j['student_name']) ?? 'Enquiry',
        parentName = _str(j['parent_name']),
        phone = _str(j['phone']),
        course = _str(j['course']),
        asked = _str(j['asked']),
        preferredDate = _str(j['preferred_date']),
        stale = j['stale'] == true;
}

class DemoInsights {
  final int pending;
  final int stale;
  final List<DemoInsightRow> bookings;
  DemoInsights(Map<String, dynamic> j)
      : pending = _int(j['pending']),
        stale = _int(j['stale']),
        bookings = _maps(j['bookings']).map(DemoInsightRow.new).toList();
}

class CapacityRow {
  final int batchId;
  final String batchName;
  final String? courseName;
  final String? teacherName;
  final int students;
  final int? maxStudents;
  final String state; // over|full|empty|small
  CapacityRow(Map<String, dynamic> j)
      : batchId = _int(j['batch_id']),
        batchName = _str(j['batch_name']) ?? 'Batch',
        courseName = _str(j['course_name']),
        teacherName = _str(j['teacher_name']),
        students = _int(j['students']),
        maxStudents = _intOrNull(j['max_students']),
        state = _str(j['state']) ?? '';
}

class CapacityInsights {
  final int count;
  final List<CapacityRow> batches;
  CapacityInsights(Map<String, dynamic> j)
      : count = _int(j['count']),
        batches = _maps(j['batches']).map(CapacityRow.new).toList();
}

class TrendPoint {
  final String period;
  final num billed;
  final num collected;
  TrendPoint(Map<String, dynamic> j)
      : period = _str(j['period']) ?? '',
        billed = _num(j['billed']),
        collected = _num(j['collected']);

  /// "Nov" from "November 2026".
  String get shortLabel => period.length >= 3 ? period.substring(0, 3) : period;
}

class ExtraBillInsight {
  final int id;
  final String title;
  final String? category;
  final String? dueDate;
  final int bills;
  final int paid;
  final num paidAmount;
  final num dueAmount;
  ExtraBillInsight(Map<String, dynamic> j)
      : id = _int(j['id']),
        title = _str(j['title']) ?? 'Bill',
        category = _str(j['category']),
        dueDate = _str(j['due_date']),
        bills = _int(j['bills']),
        paid = _int(j['paid']),
        paidAmount = _num(j['paid_amount']),
        dueAmount = _num(j['due_amount']);
}

class AdminInsights {
  final AttendanceInsights attendance;
  final FeeInsights fees;
  final NotInBatchInsights notInBatch;
  final UnmarkedInsights unmarked;
  final TodayInsights today;
  final JoinerInsights joiners;
  final BirthdayInsights birthdays;
  final DemoInsights demos;
  final CapacityInsights capacity;
  final List<TrendPoint> trend;
  final List<ExtraBillInsight> extraBills;

  const AdminInsights({
    required this.attendance,
    required this.fees,
    required this.notInBatch,
    required this.unmarked,
    required this.today,
    required this.joiners,
    required this.birthdays,
    required this.demos,
    required this.capacity,
    required this.trend,
    required this.extraBills,
  });

  factory AdminInsights.fromJson(Map<String, dynamic> j) {
    Map<String, dynamic> m(String k) =>
        Map<String, dynamic>.from((j[k] as Map?) ?? const {});
    return AdminInsights(
      attendance: AttendanceInsights.fromJson(m('attendance')),
      fees: FeeInsights.fromJson(m('fees')),
      notInBatch: NotInBatchInsights.fromJson(m('not_in_batch')),
      unmarked: UnmarkedInsights(m('unmarked')),
      today: TodayInsights(m('today')),
      joiners: JoinerInsights(m('joiners')),
      birthdays: BirthdayInsights(m('birthdays')),
      demos: DemoInsights(m('demos')),
      capacity: CapacityInsights(m('capacity')),
      trend: _maps(j['trend']).map(TrendPoint.new).toList(),
      extraBills: _maps(j['extra_bills']).map(ExtraBillInsight.new).toList(),
    );
  }

  /// Latest "students not in a batch" count from any load, so the batches
  /// screen banner stays in step with the dashboard and the list screen.
  static final ValueNotifier<int> notInBatchCount = ValueNotifier<int>(0);

  /// Fetches the insights; throws a readable message on failure.
  static Future<AdminInsights> load({int days = 30, int threshold = 75}) async {
    Response r;
    try {
      r = await sl<ApiClient>()
          .getAdminInsights(days: days, threshold: threshold);
    } catch (_) {
      throw 'Could not load. Check the connection.';
    }
    final code = r.statusCode ?? 0;
    if (code < 200 || code >= 300 || r.data is! Map) {
      final d = r.data;
      if (d is Map && d['message'] is String) throw d['message'] as String;
      throw 'Could not load (error $code).';
    }
    final d = AdminInsights.fromJson(Map<String, dynamic>.from(r.data as Map));
    notInBatchCount.value = d.notInBatch.studentsCount;
    return d;
  }
}

// ------------------------------------------------------------ helpers ----

/// "5:30 PM" from "17:30"; empty if missing.
String insightTime(String? hhmm) {
  if (hhmm == null || hhmm.isEmpty) return '';
  final p = hhmm.split(':');
  final h = int.tryParse(p[0]);
  if (h == null) return hhmm;
  final m = p.length > 1 ? p[1].padLeft(2, '0') : '00';
  final h12 = h % 12 == 0 ? 12 : h % 12;
  return m == '00' ? '$h12 ${h < 12 ? 'AM' : 'PM'}' : '$h12:$m ${h < 12 ? 'AM' : 'PM'}';
}

/// "Tue, 3 Nov" from "2026-11-03".
String insightDay(String? ymd) {
  final d = ymd == null ? null : DateTime.tryParse(ymd);
  if (d == null) return ymd ?? '';
  const w = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const m = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return '${w[d.weekday - 1]}, ${d.day} ${m[d.month - 1]}';
}

/// "4 Nov 2026" from "2026-11-04"; the input unchanged if it doesn't parse.
String insightDate(String? ymd) {
  if (ymd == null) return '';
  final d = DateTime.tryParse(ymd);
  if (d == null) return ymd;
  const m = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return '${d.day} ${m[d.month - 1]} ${d.year}';
}

Future<void> dialPhone(BuildContext context, String phone) async {
  final digits = phone.replaceAll(RegExp(r'[^0-9+]'), '');
  if (digits.isEmpty) return;
  final messenger = ScaffoldMessenger.of(context);
  try {
    final ok = await launchUrl(Uri(scheme: 'tel', path: digits));
    if (!ok) throw 'no dialer';
  } catch (_) {
    messenger.showSnackBar(
        const SnackBar(content: Text('Could not open the dialer.')));
  }
}

/// Phone number with a call button; tapping anywhere on it dials.
class PhoneLink extends StatelessWidget {
  final String? phone;
  const PhoneLink(this.phone, {super.key});

  @override
  Widget build(BuildContext context) {
    final p = phone;
    if (p == null || p.isEmpty) {
      return const Text('No phone', style: AppTextStyles.caption);
    }
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => dialPhone(context, p),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.call, size: 16, color: AppColors.success),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                p,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.success,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Small coloured label, e.g. "Missed last 3 in a row".
class InsightChip extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;
  const InsightChip(this.label, {super.key, required this.color, this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.caption
                  .copyWith(color: color, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

/// Error message with a Retry button, centred.
class InsightError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const InsightError({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined,
                size: 48, color: AppColors.textSecondary),
            const SizedBox(height: 12),
            Text(message,
                textAlign: TextAlign.center, style: AppTextStyles.bodyMedium),
            const SizedBox(height: 8),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

/// Search field used at the top of the insight lists.
class InsightSearchField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final ValueChanged<String> onChanged;
  const InsightSearchField({
    super.key,
    required this.controller,
    required this.hint,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: const Icon(Icons.search),
        suffixIcon: controller.text.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.clear),
                onPressed: () {
                  controller.clear();
                  onChanged('');
                },
              )
            : null,
        isDense: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      onChanged: onChanged,
    );
  }
}

bool insightMatches(String q, List<String?> fields) {
  final s = q.trim().toLowerCase();
  if (s.isEmpty) return true;
  return fields.any((f) => (f ?? '').toLowerCase().contains(s));
}
