/// A make-up (compensation) class for a cancelled class, from GET /api/makeups
/// (and the `makeups` lists in the home, teacher and admin summaries).
///
/// state: owed (no date yet) -> scheduled (has a date, can still be moved)
/// -> done (held: attendance marked for it, or "Mark as done").
class MakeupRow {
  /// The cancelled session's id; every make-up action is keyed by it.
  final int id;
  final int batchId;
  final String batchName;
  final String? courseName;
  final String? teacherName;
  final int? teacherId;
  final String cancelledDate; // YYYY-MM-DD
  final String? cancelReason;
  final int? makeupId;
  final String? makeupDate; // YYYY-MM-DD
  final String? startTime; // HH:MM
  final String? endTime; // HH:MM
  final String? closedAt;
  final String? closedByName;
  final int students;
  final String state; // owed | scheduled | done

  const MakeupRow({
    required this.id,
    this.batchId = 0,
    this.batchName = '',
    this.courseName,
    this.teacherName,
    this.teacherId,
    this.cancelledDate = '',
    this.cancelReason,
    this.makeupId,
    this.makeupDate,
    this.startTime,
    this.endTime,
    this.closedAt,
    this.closedByName,
    this.students = 0,
    this.state = 'owed',
  });

  bool get isOwed => state == 'owed';
  bool get isScheduled => state == 'scheduled';
  bool get isDone => state == 'done';

  factory MakeupRow.fromJson(Map<String, dynamic> j) {
    int? intOrNull(dynamic v) =>
        v == null ? null : (v is num ? v.toInt() : int.tryParse('$v'));
    String? str(dynamic v) {
      final s = v?.toString().trim();
      return (s == null || s.isEmpty) ? null : s;
    }

    String? hhmm(dynamic v) {
      final s = str(v);
      return s == null ? null : (s.length > 5 ? s.substring(0, 5) : s);
    }

    final state = str(j['state']) ?? 'owed';
    return MakeupRow(
      id: intOrNull(j['id']) ?? 0,
      batchId: intOrNull(j['batch_id']) ?? 0,
      batchName: str(j['batch_name']) ?? 'Batch',
      courseName: str(j['course_name']),
      teacherName: str(j['teacher_name']),
      teacherId: intOrNull(j['teacher_id']),
      cancelledDate: str(j['cancelled_date']) ?? '',
      cancelReason: str(j['cancel_reason']),
      makeupId: intOrNull(j['makeup_id']),
      makeupDate: str(j['makeup_date']),
      startTime: hhmm(j['start_time']),
      endTime: hhmm(j['end_time']),
      closedAt: str(j['closed_at']),
      closedByName: str(j['closed_by_name']),
      students: intOrNull(j['students']) ?? 0,
      state: const {'owed', 'scheduled', 'done'}.contains(state) ? state : 'owed',
    );
  }

  static List<MakeupRow> listFrom(dynamic v) => v is List
      ? v
          .whereType<Map>()
          .map((m) => MakeupRow.fromJson(Map<String, dynamic>.from(m)))
          .toList()
      : const [];

  /// "Mon, 9 Nov, 5:30 PM–6:30 PM" (no time part when there is none).
  String get when {
    final day = makeupDayLabel(makeupDate);
    final a = makeupClock(startTime), b = makeupClock(endTime);
    if (a.isEmpty) return day;
    return '$day, $a${b.isEmpty ? '' : '–$b'}';
  }
}

const _mkWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _mkMonths = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

DateTime? _mkDate(String? ymd) => (ymd == null || ymd.length < 10)
    ? null
    : DateTime.tryParse(ymd.substring(0, 10));

/// "Mon, 9 Nov" from "2026-11-09".
String makeupDayLabel(String? ymd) {
  final d = _mkDate(ymd);
  if (d == null) return ymd ?? '';
  return '${_mkWeekdays[d.weekday - 1]}, ${d.day} ${_mkMonths[d.month - 1]}';
}

/// "6 Nov" from "2026-11-06".
String makeupShortDate(String? ymd) {
  final d = _mkDate(ymd);
  if (d == null) return ymd ?? '';
  return '${d.day} ${_mkMonths[d.month - 1]}';
}

/// "5:30 PM" from "17:30"; empty if missing.
String makeupClock(String? hhmm) {
  if (hhmm == null || hhmm.isEmpty) return '';
  final p = hhmm.split(':');
  final h = int.tryParse(p[0]);
  if (h == null) return hhmm;
  final m = p.length > 1 ? p[1].padLeft(2, '0').substring(0, 2) : '00';
  return '${h % 12 == 0 ? 12 : h % 12}:$m ${h < 12 ? 'AM' : 'PM'}';
}
