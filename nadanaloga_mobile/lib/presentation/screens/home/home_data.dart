import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/course_model.dart';
import '../../../data/models/event_model.dart';
import '../../../data/models/grade_exam_model.dart';
import '../../../data/models/notice_model.dart';
import 'class_schedule.dart';

/// A course + grade a student is placed in (from GET /api/household).
class MemberCourse {
  final String course;
  final String? grade;
  final double monthlyFee;
  final double discountPercentage;
  final double netAmount;

  const MemberCourse({
    required this.course,
    this.grade,
    this.monthlyFee = 0,
    this.discountPercentage = 0,
    this.netAmount = 0,
  });

  String get label =>
      grade == null || grade!.isEmpty ? course : '$course · $grade';
}

/// Someone behind this login's phone number: a student (the adult or a child)
/// or the teacher role.
class HouseholdMember {
  final int id;
  final String name;
  final String role;
  final bool isChild;
  final String? photoUrl;
  final List<String> registeredCourses;
  final List<MemberCourse> courses;
  final List<String> batchNames;

  const HouseholdMember({
    required this.id,
    required this.name,
    required this.role,
    required this.isChild,
    this.photoUrl,
    this.registeredCourses = const [],
    this.courses = const [],
    this.batchNames = const [],
  });

  bool get isStudent => role == 'Student';
  bool get isTeacher => role == 'Teacher';

  /// Course names for display: graded courses first, then any registered
  /// course not yet graded.
  List<String> get courseLabels {
    final labels = courses.map((c) => c.label).toList();
    final graded = courses.map((c) => c.course.trim().toLowerCase()).toSet();
    for (final r in registeredCourses) {
      if (!graded.contains(r.trim().toLowerCase())) labels.add(r);
    }
    return labels;
  }

  factory HouseholdMember.fromJson(Map<String, dynamic> m) {
    double n(dynamic v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
    return HouseholdMember(
      id: m['id'] is int ? m['id'] as int : int.tryParse('${m['id']}') ?? 0,
      name: '${m['name'] ?? ''}',
      role: '${m['role'] ?? ''}',
      isChild: m['kind'] == 'child',
      photoUrl: m['photo_url'] as String?,
      registeredCourses:
          ((m['courses'] as List?) ?? const []).map((e) => '$e').toList(),
      courses: ((m['course_grades'] as List?) ?? const [])
          .whereType<Map>()
          .map((g) => MemberCourse(
                course: '${g['course_name'] ?? 'Course'}',
                grade: g['grade_name'] as String?,
                monthlyFee: n(g['monthly_fee']),
                discountPercentage: n(g['discount_percentage']),
                netAmount: n(g['net_amount']),
              ))
          .toList(),
      batchNames:
          ((m['batch_names'] as List?) ?? const []).map((e) => '$e').toList(),
    );
  }
}

/// This month's fees for one student (from GET /api/household/fees).
class MemberFees {
  final double generated;
  final double paid;
  final double due;

  const MemberFees({this.generated = 0, this.paid = 0, this.due = 0});

  bool get hasBill => generated > 0;
  bool get allPaid => hasBill && due <= 0;
}

/// Everything the home dashboard shows, loaded in one go.
class HomeData {
  final List<HouseholdMember> members;
  final HouseholdMember? teacher;
  final Map<String, dynamic>? fees;
  final List<BatchModel> batches;
  final List<CourseModel> courses;
  final List<EventModel> events;
  final List<NoticeModel> notices;
  final List<GradeExamModel> exams;

  /// Sections that could not be loaded (shown as a quiet retry note).
  final bool partial;

  const HomeData({
    this.members = const [],
    this.teacher,
    this.fees,
    this.batches = const [],
    this.courses = const [],
    this.events = const [],
    this.notices = const [],
    this.exams = const [],
    this.partial = false,
  });

  List<HouseholdMember> get students =>
      members.where((m) => m.isStudent).toList();

  Set<int> get studentIds => students.map((s) => s.id).toSet();

  String get period => '${fees?['period'] ?? ''}';
  bool get hasBill => fees?['has_bill'] == true;
  bool get allPaid => fees?['all_paid'] == true;
  double get totalDue => (fees?['total_due'] as num?)?.toDouble() ?? 0;
  double get totalPaid => (fees?['total_paid'] as num?)?.toDouble() ?? 0;

  /// Earliest due date among this month's unpaid bills, date part only.
  DateTime? get dueDate {
    final raw = fees?['due_date'];
    if (raw is! String || raw.length < 10) return null;
    return DateTime.tryParse(raw.substring(0, 10));
  }

  MemberFees feesFor(int studentId) {
    for (final s in ((fees?['students'] as List?) ?? const []).whereType<Map>()) {
      final id = s['student_id'] is int
          ? s['student_id'] as int
          : int.tryParse('${s['student_id']}');
      if (id == studentId) {
        double n(String k) => (s[k] as num?)?.toDouble() ?? 0;
        return MemberFees(
            generated: n('month_generated'), paid: n('month_paid'), due: n('month_due'));
      }
    }
    return const MemberFees();
  }

  String courseNameOf(BatchModel b) {
    for (final c in courses) {
      if (c.id == b.courseId) return c.name;
    }
    return '';
  }

  /// Batches a household student attends.
  List<BatchModel> batchesOf(int studentId) =>
      batches.where((b) => b.allStudentIds.contains(studentId)).toList();

  /// Batches any household student attends.
  List<BatchModel> get learningBatches {
    final ids = studentIds;
    return batches.where((b) => b.allStudentIds.any(ids.contains)).toList();
  }

  List<BatchModel> get teachingBatches => teacher == null
      ? const []
      : batches.where((b) => b.teacherId == teacher!.id).toList();

  int get studentsTaught =>
      teachingBatches.expand((b) => b.allStudentIds).toSet().length;

  List<ClassSession> get upcomingClasses {
    final ids = studentIds;
    final nameById = {for (final s in students) s.id: s.name};
    final relevant = {
      for (final b in [...learningBatches, ...teachingBatches]) b.id: b
    }.values.toList();
    return ClassSchedule.upcoming(
      batches: relevant,
      courseNameOf: courseNameOf,
      learnersOf: (b) => b.allStudentIds
          .where(ids.contains)
          .map((id) => nameById[id] ?? '')
          .where((n) => n.isNotEmpty)
          .toList(),
      isTeaching: (b) => teacher != null && b.teacherId == teacher!.id,
    );
  }

  /// Upcoming events and exams (for this household), soonest first.
  List<ComingUpItem> get comingUp {
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day);
    DateTime? day(String? s) =>
        (s == null || s.length < 10) ? null : DateTime.tryParse(s.substring(0, 10));
    final ids = studentIds;
    final items = <ComingUpItem>[
      for (final e in events)
        if (e.isActive && (day(e.eventDate)?.isBefore(start) == false))
          ComingUpItem(
              kind: ComingUpKind.event,
              title: e.title,
              date: day(e.eventDate),
              detail: [e.eventTime, e.location]
                  .where((v) => v != null && v.trim().isNotEmpty)
                  .join(' · ')),
      for (final x in exams)
        if ((x.recipientIds == null ||
                x.recipientIds!.isEmpty ||
                x.recipientIds!.any(ids.contains)) &&
            (day(x.examDate)?.isBefore(start) == false))
          ComingUpItem(
              kind: ComingUpKind.exam,
              title: x.examName,
              date: day(x.examDate),
              detail: [x.course, x.examTime]
                  .where((v) => v != null && v.trim().isNotEmpty)
                  .join(' · ')),
    ]..sort((a, b) => a.date!.compareTo(b.date!));
    return items;
  }

  List<NoticeModel> get latestNotices {
    final list = notices.where((n) => n.isActive).toList()
      ..sort((a, b) => (b.createdAt ?? '').compareTo(a.createdAt ?? ''));
    return list;
  }

  static Future<HomeData> load(ApiClient api) async {
    Future<Response?> safe(Future<Response> f) async {
      try {
        final r = await f;
        return r.statusCode == 200 ? r : null;
      } catch (_) {
        return null;
      }
    }

    final r = await Future.wait([
      safe(api.getHousehold()),
      safe(api.getHouseholdFees()),
      safe(api.getBatches()),
      safe(api.getCourses()),
      safe(api.getEvents()),
      safe(api.getNotices()),
      safe(api.getGradeExams()),
    ]);

    List<T> list<T>(Response? res, T Function(Map<String, dynamic>) parse) {
      if (res?.data is! List) return <T>[];
      final out = <T>[];
      for (final e in (res!.data as List).whereType<Map>()) {
        try {
          out.add(parse(Map<String, dynamic>.from(e)));
        } catch (_) {}
      }
      return out;
    }

    final household = r[0]?.data is Map
        ? Map<String, dynamic>.from(r[0]!.data as Map)
        : const <String, dynamic>{};
    final members = ((household['members'] as List?) ?? const [])
        .whereType<Map>()
        .map((m) => HouseholdMember.fromJson(Map<String, dynamic>.from(m)))
        .toList();
    final teacherJson = household['teacher'];

    return HomeData(
      members: members,
      teacher: teacherJson is Map
          ? HouseholdMember.fromJson(Map<String, dynamic>.from(teacherJson))
          : null,
      fees: r[1]?.data is Map ? Map<String, dynamic>.from(r[1]!.data as Map) : null,
      batches: list(r[2], BatchModel.fromJson),
      courses: list(r[3], CourseModel.fromJson),
      events: list(r[4], EventModel.fromJson),
      notices: list(r[5], NoticeModel.fromJson),
      exams: list(r[6], GradeExamModel.fromJson),
      partial: r.take(2).any((x) => x == null),
    );
  }
}

enum ComingUpKind { event, exam }

class ComingUpItem {
  final ComingUpKind kind;
  final String title;
  final DateTime? date;
  final String detail;

  const ComingUpItem({
    required this.kind,
    required this.title,
    required this.date,
    required this.detail,
  });
}
