import '../../../data/models/batch_model.dart';

/// One weekly slot of a batch: weekday (1 = Monday … 7 = Sunday) and times.
class WeeklySlot {
  final int weekday;
  final int? startMinutes; // minutes after midnight
  final int? endMinutes;

  const WeeklySlot(this.weekday, this.startMinutes, this.endMinutes);
}

/// One upcoming class within the next seven days.
class ClassSession {
  final DateTime start;
  final DateTime? end;
  final bool hasTime;
  final BatchModel batch;
  final String courseName;

  /// Household students who attend this batch (empty when only teaching).
  final List<String> learners;

  /// True when the signed-in teacher takes this batch.
  final bool teaching;

  const ClassSession({
    required this.start,
    required this.end,
    required this.hasTime,
    required this.batch,
    required this.courseName,
    required this.learners,
    required this.teaching,
  });
}

class ClassSchedule {
  ClassSchedule._();

  static const _dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  static const _dayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  static int? weekdayOf(String day) {
    final key = day.trim().toLowerCase();
    if (key.length < 3) return null;
    final i = _dayKeys.indexOf(key.substring(0, 3));
    return i < 0 ? null : i + 1;
  }

  /// "17:00", "17:00:00", "5:00 PM", "5 pm" → minutes after midnight.
  static int? minutesOf(String? time) {
    if (time == null) return null;
    final m = RegExp(r'^\s*(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([aApP][mM])?\s*$')
        .firstMatch(time);
    if (m == null) return null;
    var hour = int.parse(m.group(1)!);
    final minute = int.tryParse(m.group(2) ?? '0') ?? 0;
    final ampm = m.group(3)?.toLowerCase();
    if (ampm == 'pm' && hour < 12) hour += 12;
    if (ampm == 'am' && hour == 12) hour = 0;
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }

  /// "5:00 PM" from minutes after midnight.
  static String clock(int minutes) {
    final h = minutes ~/ 60;
    final mm = (minutes % 60).toString().padLeft(2, '0');
    final h12 = h % 12 == 0 ? 12 : h % 12;
    return '$h12:$mm ${h < 12 ? 'AM' : 'PM'}';
  }

  /// Structured weekly slots: per-day time slots first, then days + one time
  /// range. Legacy free-text schedules have no reliable day, so they are left
  /// to [timingLines].
  static List<WeeklySlot> slotsOf(BatchModel b) {
    final slots = <WeeklySlot>[];
    if (b.timeSlots.isNotEmpty) {
      for (final s in b.timeSlots) {
        final wd = weekdayOf(s.day);
        if (wd != null) {
          slots.add(WeeklySlot(wd, minutesOf(s.startTime), minutesOf(s.endTime)));
        }
      }
      return slots;
    }
    for (final d in b.days) {
      final wd = weekdayOf(d);
      if (wd != null) {
        slots.add(WeeklySlot(wd, minutesOf(b.startTime), minutesOf(b.endTime)));
      }
    }
    return slots;
  }

  /// Readable timings for a batch, e.g. ["Mon 5:00 PM – 6:00 PM"].
  static List<String> timingLines(BatchModel b) {
    final slots = slotsOf(b);
    if (slots.isNotEmpty) {
      return slots.map((s) {
        final day = _dayShort[s.weekday - 1];
        if (s.startMinutes == null) return day;
        final end = s.endMinutes == null ? '' : ' – ${clock(s.endMinutes!)}';
        return '$day ${clock(s.startMinutes!)}$end';
      }).toList();
    }
    final legacy = b.schedule
        .map((s) => s.timing)
        .whereType<String>()
        .where((t) => t.trim().isNotEmpty)
        .toList();
    return legacy;
  }

  /// Classes in the next seven days (today's finished classes excluded),
  /// earliest first.
  static List<ClassSession> upcoming({
    required List<BatchModel> batches,
    required String Function(BatchModel) courseNameOf,
    required List<String> Function(BatchModel) learnersOf,
    required bool Function(BatchModel) isTeaching,
    DateTime? now,
  }) {
    final t = now ?? DateTime.now();
    final today = DateTime(t.year, t.month, t.day);
    final nowMinutes = t.hour * 60 + t.minute;
    final sessions = <ClassSession>[];

    for (final b in batches) {
      for (final s in slotsOf(b)) {
        var ahead = (s.weekday - t.weekday + 7) % 7;
        if (ahead == 0) {
          // Over already (or, with no end time, started an hour ago)?
          final over = s.endMinutes ??
              (s.startMinutes == null ? null : s.startMinutes! + 60);
          if (over != null && over <= nowMinutes) ahead = 7;
        }
        if (ahead >= 7) continue;
        final day = today.add(Duration(days: ahead));
        final start = day.add(Duration(minutes: s.startMinutes ?? 0));
        sessions.add(ClassSession(
          start: start,
          end: s.endMinutes == null
              ? null
              : day.add(Duration(minutes: s.endMinutes!)),
          hasTime: s.startMinutes != null,
          batch: b,
          courseName: courseNameOf(b),
          learners: learnersOf(b),
          teaching: isTeaching(b),
        ));
      }
    }
    sessions.sort((a, b) => a.start.compareTo(b.start));
    return sessions;
  }

  static int weeklyClassCount(Iterable<BatchModel> batches) =>
      batches.fold(0, (sum, b) => sum + slotsOf(b).length);

  /// "Today", "Tomorrow" or "Mon".
  static String dayLabel(DateTime date, {DateTime? now}) {
    final t = now ?? DateTime.now();
    final diff = DateTime(date.year, date.month, date.day)
        .difference(DateTime(t.year, t.month, t.day))
        .inDays;
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Tomorrow';
    return _dayShort[date.weekday - 1];
  }
}
