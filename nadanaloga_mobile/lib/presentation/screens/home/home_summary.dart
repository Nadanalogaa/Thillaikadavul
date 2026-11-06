import '../../../core/network/api_client.dart';
import '../../../data/models/makeup_model.dart';

// Parsed GET /api/home/summary (family) and GET /api/teacher/summary (teacher).
// Every field is optional on the wire; parsing never throws.

int _int(dynamic v) =>
    v is int ? v : (v is num ? v.toInt() : int.tryParse('$v') ?? 0);
int? _intOrNull(dynamic v) =>
    v == null ? null : (v is num ? v.toInt() : int.tryParse('$v'));
String _str(dynamic v) => v == null ? '' : '$v';
String? _strOrNull(dynamic v) {
  if (v == null) return null;
  final s = '$v'.trim();
  return s.isEmpty ? null : s;
}

List<Map<String, dynamic>> _maps(dynamic v) => v is List
    ? v.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList()
    : const [];

Map<String, dynamic>? _map(dynamic v) =>
    v is Map ? Map<String, dynamic>.from(v) : null;

/// "YYYY-MM-DD" (or an ISO timestamp) to a local date, or null.
DateTime? summaryDate(String? s) =>
    (s == null || s.length < 10) ? null : DateTime.tryParse(s.substring(0, 10));

/// "18:00" / "18:00:00" → minutes after midnight.
int? summaryMinutes(String? hhmm) {
  if (hhmm == null || hhmm.isEmpty) return null;
  final p = hhmm.split(':');
  final h = int.tryParse(p[0]);
  final m = p.length > 1 ? int.tryParse(p[1]) ?? 0 : 0;
  return h == null ? null : h * 60 + m;
}

/// "Offline" means a class at the academy; say so in plain words.
String _modeLabel(String? mode) {
  final m = (mode ?? '').trim();
  if (m.toLowerCase() == 'offline') return 'In person';
  return m;
}

/// The name to call a child by, skipping initials: "A Meghna" → "Meghna",
/// "A.Shivanya" → "Shivanya", "Lakshvika V" → "Lakshvika".
String childCallName(String full) {
  final parts = full.trim().split(RegExp(r'[\s.]+')).where((p) => p.isNotEmpty).toList();
  for (final p in parts) {
    if (p.length >= 3) return p;
  }
  return full.trim();
}

/// "18:00" → "6:00 PM".
String clock12(String? hhmm) {
  final mins = summaryMinutes(hhmm);
  if (mins == null) return '';
  final h = mins ~/ 60, m = mins % 60;
  final h12 = h % 12 == 0 ? 12 : h % 12;
  return '$h12:${m.toString().padLeft(2, '0')} ${h < 12 ? 'AM' : 'PM'}';
}

const _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];
const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/// "2 Nov".
String shortDay(DateTime d) => '${d.day} ${_months[d.month - 1]}';

/// "Tue, 3 Nov".
String weekdayDay(DateTime d) => '${_weekdays[d.weekday - 1]}, ${shortDay(d)}';

String monthAbbr(DateTime d) => _months[d.month - 1].toUpperCase();
String weekdayAbbr(DateTime d) => _weekdays[d.weekday - 1];

/// One scheduled class (next class / this week).
class SummaryClass {
  final DateTime? date;
  final String day;
  final String startTime;
  final String endTime;
  final int batchId;
  final String batchName;
  final String courseName;
  final String teacherName;
  final String? mode;
  final String? studio;
  final String? locationName;
  final bool cancelled;
  final String? cancelReason;
  final String when;

  /// A make-up class given back for a cancelled one.
  final bool isMakeup;

  /// Household children in this class (filled when merging the family week).
  final List<String> learners;

  const SummaryClass({
    this.date,
    this.day = '',
    this.startTime = '',
    this.endTime = '',
    this.batchId = 0,
    this.batchName = '',
    this.courseName = '',
    this.teacherName = '',
    this.mode,
    this.studio,
    this.locationName,
    this.cancelled = false,
    this.cancelReason,
    this.when = '',
    this.isMakeup = false,
    this.learners = const [],
  });

  factory SummaryClass.fromJson(Map<String, dynamic> m) => SummaryClass(
        date: summaryDate(_strOrNull(m['date'])),
        day: _str(m['day']),
        startTime: _str(m['start_time']),
        endTime: _str(m['end_time']),
        batchId: _int(m['batch_id']),
        batchName: _str(m['batch_name']),
        courseName: _str(m['course_name']),
        teacherName: _str(m['teacher_name']),
        mode: _strOrNull(m['mode']),
        studio: _strOrNull(m['studio']),
        locationName: _strOrNull(m['location_name']),
        cancelled: m['cancelled'] == true,
        cancelReason: _strOrNull(m['cancel_reason']),
        when: _str(m['when']),
        isMakeup: m['is_makeup'] == true,
      );

  SummaryClass withLearners(List<String> names) => SummaryClass(
        date: date,
        day: day,
        startTime: startTime,
        endTime: endTime,
        batchId: batchId,
        batchName: batchName,
        courseName: courseName,
        teacherName: teacherName,
        mode: mode,
        studio: studio,
        locationName: locationName,
        cancelled: cancelled,
        cancelReason: cancelReason,
        when: when,
        isMakeup: isMakeup,
        learners: names,
      );

  bool get isOnline => (mode ?? '').toLowerCase() == 'online';

  /// Studio / centre, or "Online".
  String get place {
    if (isOnline) return 'Online';
    final parts = [studio, locationName].whereType<String>().toList();
    if (parts.isNotEmpty) return parts.join(' · ');
    return _modeLabel(mode);
  }

  DateTime? get start {
    final mins = summaryMinutes(startTime);
    if (date == null) return null;
    return date!.add(Duration(minutes: mins ?? 0));
  }

  DateTime? get end {
    final mins = summaryMinutes(endTime);
    if (date == null || mins == null) return null;
    return date!.add(Duration(minutes: mins));
  }

  String get timeRange {
    final a = clock12(startTime), b = clock12(endTime);
    if (a.isEmpty) return 'Time TBA';
    return b.isEmpty ? a : '$a – $b';
  }

  /// "Today", "Tomorrow" or the weekday name.
  String dayWord(DateTime now) {
    final d = date;
    if (d == null) return day;
    final today = DateTime(now.year, now.month, now.day);
    final diff = d.difference(today).inDays;
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Tomorrow';
    if (diff > 1 && diff < 7) return day.isNotEmpty ? day : weekdayDay(d);
    return weekdayDay(d);
  }

  /// "Today 6:00 PM · in 2 h", "On now · until 7:00 PM", "Tomorrow 7:00 PM".
  String countdown(DateTime now) {
    final s = start, e = end;
    final time = clock12(startTime);
    final word = dayWord(now);
    if (cancelled) {
      return [word, if (time.isNotEmpty) time, '· Cancelled'].join(' ');
    }
    if (s != null && e != null && !now.isBefore(s) && now.isBefore(e)) {
      return 'On now · until ${clock12(endTime)}';
    }
    if (s != null && word == 'Today' && s.isAfter(now)) {
      final mins = s.difference(now).inMinutes;
      final inText = mins < 60
          ? 'in ${mins < 1 ? 1 : mins} min'
          : 'in ${(mins / 60).round()} h';
      return 'Today $time · $inText';
    }
    return time.isEmpty ? word : '$word $time';
  }
}

class AttendanceCount {
  final int classes;
  final int attended;
  final int? percentage;
  const AttendanceCount({this.classes = 0, this.attended = 0, this.percentage});

  factory AttendanceCount.fromJson(Map<String, dynamic>? m) => m == null
      ? const AttendanceCount()
      : AttendanceCount(
          classes: _int(m['classes']),
          attended: _int(m['attended']),
          percentage: _intOrNull(m['percentage']),
        );
}

class RecentMark {
  final DateTime? date;
  final String status; // present | absent | late
  final String batchName;
  const RecentMark({this.date, this.status = '', this.batchName = ''});
}

class ClassNote {
  final DateTime? date;
  final String note;
  final String batchName;
  final String? status;
  const ClassNote(
      {this.date, this.note = '', this.batchName = '', this.status});
}

class BirthdayInfo {
  final DateTime? date;
  final int inDays;
  final int? turns;
  const BirthdayInfo({this.date, this.inDays = 0, this.turns});
}

class SummaryBatch {
  final int id;
  final String name;
  final String courseName;
  final String teacherName;
  final String? mode;
  final String? studio;
  final String? locationName;
  const SummaryBatch({
    required this.id,
    this.name = '',
    this.courseName = '',
    this.teacherName = '',
    this.mode,
    this.studio,
    this.locationName,
  });
}

/// One child (student) of the household.
class ChildSummary {
  final int id;
  final String name;
  final List<String> courses;
  final List<SummaryBatch> batches;
  final SummaryClass? nextClass;
  final List<SummaryClass> week;
  final AttendanceCount month;
  final AttendanceCount last90;
  final List<RecentMark> recent;
  final ClassNote? lastNote;
  final BirthdayInfo? birthday;

  /// Open make-ups (owed or scheduled) for this child's batches.
  final List<MakeupRow> makeups;

  const ChildSummary({
    required this.id,
    required this.name,
    this.courses = const [],
    this.batches = const [],
    this.nextClass,
    this.week = const [],
    this.month = const AttendanceCount(),
    this.last90 = const AttendanceCount(),
    this.recent = const [],
    this.lastNote,
    this.birthday,
    this.makeups = const [],
  });

  factory ChildSummary.fromJson(Map<String, dynamic> m) {
    final att = _map(m['attendance']);
    final note = _map(m['last_note']);
    final bday = _map(m['birthday']);
    final next = _map(m['next_class']);
    return ChildSummary(
      id: _int(m['id']),
      name: _str(m['name']),
      courses: ((m['courses'] as List?) ?? const []).map((e) => '$e').toList(),
      batches: [
        for (final b in _maps(m['batches']))
          SummaryBatch(
            id: _int(b['id']),
            name: _str(b['name']),
            courseName: _str(b['course_name']),
            teacherName: _str(b['teacher_name']),
            mode: _strOrNull(b['mode']),
            studio: _strOrNull(b['studio']),
            locationName: _strOrNull(b['location_name']),
          ),
      ],
      nextClass: next == null ? null : SummaryClass.fromJson(next),
      week: _maps(m['week']).map(SummaryClass.fromJson).toList(),
      month: AttendanceCount.fromJson(_map(att?['month'])),
      last90: AttendanceCount.fromJson(_map(att?['last_90_days'])),
      recent: [
        for (final r in _maps(att?['recent']))
          RecentMark(
            date: summaryDate(_strOrNull(r['date'])),
            status: _str(r['status']),
            batchName: _str(r['batch_name']),
          ),
      ],
      lastNote: note == null || _str(note['note']).trim().isEmpty
          ? null
          : ClassNote(
              date: summaryDate(_strOrNull(note['date'])),
              note: _str(note['note']).trim(),
              batchName: _str(note['batch_name']),
              status: _strOrNull(note['status']),
            ),
      birthday: bday == null
          ? null
          : BirthdayInfo(
              date: summaryDate(_strOrNull(bday['date'])),
              inDays: _int(bday['in_days']),
              turns: _intOrNull(bday['turns']),
            ),
      makeups: MakeupRow.listFrom(m['makeups'])
          .where((r) => !r.isDone)
          .toList(),
    );
  }
}

class SummaryExam {
  final int id;
  final String name;
  final String? course;
  final DateTime? date;
  final String? time;
  final String? location;
  const SummaryExam(
      {required this.id,
      this.name = '',
      this.course,
      this.date,
      this.time,
      this.location});

  factory SummaryExam.fromJson(Map<String, dynamic> m) => SummaryExam(
        id: _int(m['id']),
        name: _str(m['exam_name']),
        course: _strOrNull(m['course']),
        date: summaryDate(_strOrNull(m['exam_date'])),
        time: _strOrNull(m['exam_time']),
        location: _strOrNull(m['location']),
      );
}

class SummaryEvent {
  final int id;
  final String title;
  final DateTime? date;
  final String? time;
  final String? location;
  const SummaryEvent(
      {required this.id, this.title = '', this.date, this.time, this.location});

  factory SummaryEvent.fromJson(Map<String, dynamic> m) => SummaryEvent(
        id: _int(m['id']),
        title: _str(m['title']),
        date: summaryDate(_strOrNull(m['event_date'])),
        time: _strOrNull(m['event_time']),
        location: _strOrNull(m['location']),
      );
}

class SummaryNotice {
  final int id;
  final String title;
  final String? priority;
  final DateTime? createdAt;
  const SummaryNotice(
      {required this.id, this.title = '', this.priority, this.createdAt});

  bool get isHigh => (priority ?? '').toLowerCase() == 'high';
}

/// GET /api/home/summary.
class FamilySummary {
  final List<ChildSummary> children;
  final List<SummaryExam> exams;
  final List<SummaryEvent> events;
  final List<SummaryNotice> notices;
  final int newMaterials;

  const FamilySummary({
    this.children = const [],
    this.exams = const [],
    this.events = const [],
    this.notices = const [],
    this.newMaterials = 0,
  });

  factory FamilySummary.fromJson(Map<String, dynamic> m) => FamilySummary(
        children: _maps(m['students']).map(ChildSummary.fromJson).toList(),
        exams: _maps(m['exams']).map(SummaryExam.fromJson).toList(),
        events: _maps(m['events']).map(SummaryEvent.fromJson).toList(),
        notices: [
          for (final n in _maps(m['notices']))
            SummaryNotice(
              id: _int(n['id']),
              title: _str(n['title']),
              priority: _strOrNull(n['priority']),
              createdAt: summaryDate(_strOrNull(n['created_at'])),
            ),
        ],
        newMaterials: _int(m['new_materials']),
      );

  ChildSummary? child(int id) {
    for (final c in children) {
      if (c.id == id) return c;
    }
    return null;
  }

  /// The family's classes for the next 7 days; a class two children share
  /// shows once with both names.
  List<SummaryClass> get week {
    final byKey = <String, SummaryClass>{};
    final names = <String, List<String>>{};
    for (final c in children) {
      final first = childCallName(c.name);
      for (final s in c.week) {
        final key = '${s.batchId}|${s.date}|${s.startTime}';
        byKey.putIfAbsent(key, () => s);
        (names[key] ??= []).add(first);
      }
    }
    final list = [
      for (final e in byKey.entries)
        e.value.withLearners(names[e.key] ?? const [])
    ]..sort((a, b) {
        final x = a.start, y = b.start;
        if (x == null || y == null) return 0;
        return x.compareTo(y);
      });
    return list;
  }

  static Future<FamilySummary?> load(ApiClient api) async {
    try {
      final r = await api.getHomeSummary();
      if (r.statusCode != 200 || r.data is! Map) return null;
      return FamilySummary.fromJson(Map<String, dynamic>.from(r.data as Map));
    } catch (_) {
      return null;
    }
  }
}

/// A class on the teacher's day, with its marking state.
class TeacherTodayClass {
  final int batchId;
  final String batchName;
  final String courseName;
  final String startTime;
  final String endTime;
  final int students;
  final String? studio;
  final String? locationName;
  final String? mode;
  final String state; // upcoming | running | not_marked | marked | cancelled
  final bool isMakeup;
  final String? cancelReason;

  const TeacherTodayClass({
    required this.batchId,
    this.batchName = '',
    this.courseName = '',
    this.startTime = '',
    this.endTime = '',
    this.students = 0,
    this.studio,
    this.locationName,
    this.mode,
    this.state = '',
    this.isMakeup = false,
    this.cancelReason,
  });

  bool get needsMarking => state == 'running' || state == 'not_marked';

  String get place {
    if ((mode ?? '').toLowerCase() == 'online') return 'Online';
    final parts = [studio, locationName].whereType<String>().toList();
    return parts.isNotEmpty ? parts.join(' · ') : _modeLabel(mode);
  }
}

class UnmarkedClass {
  final int batchId;
  final String batchName;
  final String courseName;
  final DateTime? date;
  final String dateRaw;
  final String startTime;
  const UnmarkedClass({
    required this.batchId,
    this.batchName = '',
    this.courseName = '',
    this.date,
    this.dateRaw = '',
    this.startTime = '',
  });
}

class LowAttendanceStudent {
  final int studentId;
  final String name;
  final String? userId;
  final String? phone;
  final String? parentName;
  final int batchId;
  final String batchName;
  final int classes;
  final int attended;
  final int? percentage;
  final int missedInARow;

  const LowAttendanceStudent({
    required this.studentId,
    this.name = '',
    this.userId,
    this.phone,
    this.parentName,
    this.batchId = 0,
    this.batchName = '',
    this.classes = 0,
    this.attended = 0,
    this.percentage,
    this.missedInARow = 0,
  });
}

class TeacherBirthday {
  final int studentId;
  final String name;
  final String? phone;
  final String? parentName;
  final DateTime? date;
  final int inDays;
  final int? turns;
  const TeacherBirthday({
    required this.studentId,
    this.name = '',
    this.phone,
    this.parentName,
    this.date,
    this.inDays = 0,
    this.turns,
  });
}

class TeacherBatchSlot {
  final String day;
  final String startTime;
  final String endTime;
  const TeacherBatchSlot(
      {this.day = '', this.startTime = '', this.endTime = ''});
}

class TeacherBatch {
  final int id;
  final String name;
  final String courseName;
  final int students;
  final List<TeacherBatchSlot> slots;
  const TeacherBatch({
    required this.id,
    this.name = '',
    this.courseName = '',
    this.students = 0,
    this.slots = const [],
  });

  /// "Tue, Thu · 7:00 PM – 8:00 PM" (slots grouped by identical time).
  List<String> get timingLines {
    final byTime = <String, List<String>>{};
    for (final s in slots) {
      final a = clock12(s.startTime), b = clock12(s.endTime);
      final t = a.isEmpty ? 'Time TBA' : (b.isEmpty ? a : '$a – $b');
      final d = s.day.length >= 3 ? s.day.substring(0, 3) : s.day;
      (byTime[t] ??= []).add(d);
    }
    return [for (final e in byTime.entries) '${e.value.join(', ')} · ${e.key}'];
  }
}

/// GET /api/teacher/summary.
class TeacherSummary {
  final int batchCount;
  final int studentCount;
  final int classesThisWeek;
  final List<TeacherTodayClass> today;
  final SummaryClass? nextClass;
  final List<UnmarkedClass> unmarked;
  final List<SummaryClass> week;
  final int attendanceClasses;
  final int? attendancePercentage;
  final List<LowAttendanceStudent> low;
  final List<TeacherBirthday> birthdays;
  final List<SummaryExam> exams;
  final List<SummaryEvent> events;
  final List<TeacherBatch> batches;
  final String todayIso;

  /// Open make-ups for the teacher's batches.
  final List<MakeupRow> makeups;

  const TeacherSummary({
    this.batchCount = 0,
    this.studentCount = 0,
    this.classesThisWeek = 0,
    this.today = const [],
    this.nextClass,
    this.unmarked = const [],
    this.week = const [],
    this.attendanceClasses = 0,
    this.attendancePercentage,
    this.low = const [],
    this.birthdays = const [],
    this.exams = const [],
    this.events = const [],
    this.batches = const [],
    this.todayIso = '',
    this.makeups = const [],
  });

  factory TeacherSummary.fromJson(Map<String, dynamic> m) {
    final counts = _map(m['counts']) ?? const {};
    final att = _map(m['attendance']) ?? const {};
    final next = _map(m['next_class']);
    return TeacherSummary(
      todayIso: _str(m['today']),
      makeups:
          MakeupRow.listFrom(m['makeups']).where((r) => !r.isDone).toList(),
      batchCount: _int(counts['batches']),
      studentCount: _int(counts['students']),
      classesThisWeek: _int(counts['classes_this_week']),
      today: [
        for (final c in _maps(m['today_classes']))
          TeacherTodayClass(
            batchId: _int(c['batch_id']),
            batchName: _str(c['batch_name']),
            courseName: _str(c['course_name']),
            startTime: _str(c['start_time']),
            endTime: _str(c['end_time']),
            students: _int(c['students']),
            studio: _strOrNull(c['studio']),
            locationName: _strOrNull(c['location_name']),
            mode: _strOrNull(c['mode']),
            state: _str(c['state']),
            isMakeup: c['is_makeup'] == true,
            cancelReason: _strOrNull(c['cancel_reason']),
          ),
      ],
      nextClass: next == null ? null : SummaryClass.fromJson(next),
      unmarked: [
        for (final u in _maps(m['unmarked']))
          UnmarkedClass(
            batchId: _int(u['batch_id']),
            batchName: _str(u['batch_name']),
            courseName: _str(u['course_name']),
            date: summaryDate(_strOrNull(u['date'])),
            dateRaw: _str(u['date']).length >= 10
                ? _str(u['date']).substring(0, 10)
                : _str(u['date']),
            startTime: _str(u['start_time']),
          ),
      ],
      week: _maps(m['week']).map(SummaryClass.fromJson).toList(),
      attendanceClasses: _int(att['classes']),
      attendancePercentage: _intOrNull(att['percentage']),
      low: [
        for (final s in _maps(att['low']))
          LowAttendanceStudent(
            studentId: _int(s['student_id']),
            name: _str(s['name']),
            userId: _strOrNull(s['user_id']),
            phone: _strOrNull(s['phone']),
            parentName: _strOrNull(s['parent_name']),
            batchId: _int(s['batch_id']),
            batchName: _str(s['batch_name']),
            classes: _int(s['classes']),
            attended: _int(s['attended']),
            percentage: _intOrNull(s['percentage']),
            missedInARow: _int(s['missed_in_a_row']),
          ),
      ],
      birthdays: [
        for (final b in _maps(m['birthdays']))
          TeacherBirthday(
            studentId: _int(b['student_id']),
            name: _str(b['name']),
            phone: _strOrNull(b['phone']),
            parentName: _strOrNull(b['parent_name']),
            date: summaryDate(_strOrNull(b['date'])),
            inDays: _int(b['in_days']),
            turns: _intOrNull(b['turns']),
          ),
      ],
      exams: _maps(m['exams']).map(SummaryExam.fromJson).toList(),
      events: _maps(m['events']).map(SummaryEvent.fromJson).toList(),
      batches: [
        for (final b in _maps(m['batches']))
          TeacherBatch(
            id: _int(b['id']),
            name: _str(b['name']),
            courseName: _str(b['course_name']),
            students: _int(b['students']),
            slots: [
              for (final s in _maps(b['slots']))
                TeacherBatchSlot(
                  day: _str(s['day']),
                  startTime: _str(s['start_time']),
                  endTime: _str(s['end_time']),
                ),
            ],
          ),
      ],
    );
  }

  static Future<TeacherSummary?> load(ApiClient api) async {
    try {
      final r = await api.getTeacherSummary();
      if (r.statusCode != 200 || r.data is! Map) return null;
      return TeacherSummary.fromJson(Map<String, dynamic>.from(r.data as Map));
    } catch (_) {
      return null;
    }
  }
}

/// A class called off in the coming days, for the band at the top of home.
class CancelledNotice {
  final DateTime? date;
  final String startTime;
  final String batchName;
  final String? reason;
  const CancelledNotice(
      {this.date, this.startTime = '', this.batchName = '', this.reason});

  factory CancelledNotice.of(SummaryClass c) => CancelledNotice(
      date: c.date,
      startTime: c.startTime,
      batchName: c.batchName,
      reason: c.cancelReason);

  /// "Class cancelled · Today · 6:00 PM" / "· Tue, 10 Nov · 6:00 PM".
  String title(DateTime now) {
    final d = date;
    String word;
    if (d == null) {
      word = 'Today';
    } else {
      final diff = d.difference(DateTime(now.year, now.month, now.day)).inDays;
      word = diff == 0 ? 'Today' : diff == 1 ? 'Tomorrow' : weekdayDay(d);
    }
    final t = clock12(startTime);
    return 'Class cancelled · $word${t.isEmpty ? '' : ' · $t'}';
  }

  String get subtitle => reason == null ? batchName : '$batchName — $reason';

  String get key => '$batchName|${date?.toIso8601String()}|$startTime';
}
