import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../admin/insights/dashboard_widgets.dart';
import '../attendance/attendance_today_screen.dart';
import '../attendance/batch_students_screen.dart';
import '../attendance/makeups_screen.dart';
import '../attendance/mark_attendance_screen.dart';
import '../attendance/student_attendance_screen.dart';
import '../student/events_list_screen.dart';
import '../student/grade_exams_list_screen.dart';
import '../student/notices_list_screen.dart';
import '../student/teaching_summary_screen.dart';
import 'dashboard_parts.dart';
import 'home_summary.dart';
import 'home_widgets.dart';

/// The teacher's home, built from GET /api/teacher/summary.
///
///   numbers      my batches · my students · classes this week
///   make-ups     cancelled classes owed or scheduled (only when there are)
///   today        timeline with state chips and a big Mark attendance button
///   to mark      classes from the last week still waiting for attendance
///   missing      students skipping classes, with a call button
///   birthdays    this week
///   my batches   with class days and times
///   coming up    exams and events
///   shortcuts
///
/// [compact] is the short version shown to a teacher who is also a parent
/// (on the family home): just today and what is left to mark.
class TeacherHomeSections {
  final BuildContext context;
  final TeacherSummary s;
  final int teacherId;
  final String teacherName;
  final Future<void> Function() reload;
  final String notificationsRoute;

  TeacherHomeSections({
    required this.context,
    required this.s,
    required this.teacherId,
    required this.teacherName,
    required this.reload,
    required this.notificationsRoute,
  });

  Future<void> _push(Widget screen, {bool reloadAfter = false}) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
    if (reloadAfter) await reload();
  }

  Future<void> _mark(int batchId, String batchName, String date) => _push(
      MarkAttendanceScreen(batchId: batchId, batchName: batchName, date: date),
      reloadAfter: true);

  void _openTeaching() => _push(
      TeachingSummaryScreen(teacherId: teacherId, teacherName: teacherName));

  /// Classes called off: today's cancelled ones plus cancelled days later
  /// in the week (shown as a band at the top of home).
  static List<CancelledNotice> cancelledNotices(TeacherSummary s) {
    final today = DateTime.tryParse(s.todayIso);
    final out = <CancelledNotice>[
      for (final c in s.today)
        if (c.state == 'cancelled')
          CancelledNotice(
              date: today,
              startTime: c.startTime,
              batchName: c.batchName,
              reason: c.cancelReason),
    ];
    for (final c in s.week) {
      if (!c.cancelled) continue;
      final sameDay = today != null &&
          c.date != null &&
          c.date!.year == today.year &&
          c.date!.month == today.month &&
          c.date!.day == today.day;
      if (!sameDay) out.add(CancelledNotice.of(c));
    }
    return out;
  }

  List<Widget> build({bool compact = false}) {
    final cancelled = compact ? const <CancelledNotice>[] : cancelledNotices(s);
    return [
      if (cancelled.isNotEmpty) ...[
        CancelledBand(notices: cancelled),
        const SizedBox(height: 12),
      ],
      if (!compact) ...[
        StatRow(tiles: [
          StatTile(
              Icons.groups_2_rounded,
              '${s.batchCount}',
              s.batchCount == 1 ? 'My batch' : 'My batches',
              AppColors.teacherAccent,
              _openTeaching),
          StatTile(
              Icons.school_rounded,
              '${s.studentCount}',
              s.studentCount == 1 ? 'My student' : 'My students',
              AppColors.primary,
              _openTeaching),
          StatTile(Icons.event_repeat_rounded, '${s.classesThisWeek}',
              'Classes this week', AppColors.studentAccent, _openWeek),
        ]),
      ],
      ..._makeups(),
      ..._today(compact),
      ..._toMark(compact),
      if (!compact) ...[
        ..._missing(),
        ..._birthdays(),
        ..._batches(),
        ..._comingUp(),
        const HomeSection('Shortcuts'),
        QuickGrid(actions: [
          HomeAction(
              Icons.fact_check_rounded,
              'Attendance',
              AppColors.teacherAccent,
              () => _push(const AttendanceTodayScreen(), reloadAfter: true),
              badge: s.unmarked.isEmpty ? null : '${s.unmarked.length}'),
          HomeAction(Icons.groups_2_rounded, 'Students', AppColors.primary,
              _openTeaching),
          HomeAction(Icons.calendar_view_week_rounded, 'This week',
              AppColors.studentAccent, _openWeek),
          HomeAction(Icons.workspace_premium_rounded, 'Exams',
              AppColors.warning, () => _push(const GradeExamsListScreen())),
          HomeAction(Icons.celebration_rounded, 'Events', AppColors.courseDance,
              () => _push(const EventsListScreen())),
          HomeAction(Icons.campaign_rounded, 'Notices', AppColors.info,
              () => _push(const NoticesListScreen())),
          HomeAction(Icons.notifications_rounded, 'Alerts',
              AppColors.courseVocal, () => context.push(notificationsRoute)),
          HomeAction(Icons.person_search_rounded, 'Follow up', AppColors.error,
              () => _push(_LowAttendancePage(students: s.low)),
              badge: s.low.isEmpty ? null : '${s.low.length}'),
        ]),
      ],
    ];
  }

  void _openMakeups() => _push(const MakeupsScreen(), reloadAfter: true);

  // -------------------------------------------------------------- makeups ---

  /// Cancelled classes still owed, or scheduled and not yet held.
  List<Widget> _makeups() {
    final list = s.makeups;
    if (list.isEmpty) return const [];
    return [
      HomeSection('Make-up classes',
          action: 'See all',
          onAction: _openMakeups),
      for (var i = 0; i < list.length; i++)
        Padding(
          padding: EdgeInsets.only(top: i == 0 ? 0 : 8),
          child: MakeupCard(row: list[i], onTap: _openMakeups),
        ),
    ];
  }

  // ---------------------------------------------------------------- today ---

  List<Widget> _today(bool compact) {
    final classes = s.today;
    final title = compact ? 'Your teaching today' : 'Today';
    if (classes.isEmpty) {
      final next = s.nextClass;
      return [
        HomeSection(title,
            action: 'All classes',
            onAction: () =>
                _push(const AttendanceTodayScreen(), reloadAfter: true)),
        if (next != null)
          NextClassHero(
            cls: next,
            overline: 'No classes today · next class',
            showTeacher: false,
            onTap: _openWeek,
          )
        else
          const CalmLine(
              icon: Icons.event_available_rounded,
              text: 'No classes today or in the next 7 days.'),
      ];
    }
    return [
      HomeSection(title,
          action: 'All classes',
          onAction: () =>
              _push(const AttendanceTodayScreen(), reloadAfter: true)),
      for (var i = 0; i < classes.length; i++)
        _timelineItem(classes[i], first: i == 0, last: i == classes.length - 1),
    ];
  }

  Widget _timelineItem(TeacherTodayClass c,
      {required bool first, required bool last}) {
    final (label, color) = todayState(c.state);
    final dim = c.state == 'marked' || c.state == 'cancelled';
    final course = c.courseName.isNotEmpty
        ? AppColors.getCourseColor(c.courseName)
        : AppColors.teacherAccent;
    final time = clock12(c.startTime);
    final parts = time.split(' ');
    final meta = [
      if (c.state == 'cancelled')
        'Class off${c.cancelReason == null ? '' : ' — ${c.cancelReason}'}',
      if (c.courseName.isNotEmpty) c.courseName,
      '${c.students} ${c.students == 1 ? 'student' : 'students'}',
      if (c.place.isNotEmpty) c.place,
    ].join(' · ');
    final today = s.todayIso.isNotEmpty ? s.todayIso : _iso(DateTime.now());

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 48,
            child: Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(parts.first,
                      style: AppTextStyles.labelLarge.copyWith(
                          fontWeight: FontWeight.w700,
                          color: dim
                              ? AppColors.textHint
                              : AppColors.textPrimary)),
                  if (parts.length > 1)
                    Text(parts.last,
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textSecondary)),
                ],
              ),
            ),
          ),
          SizedBox(
            width: 26,
            child: Column(
              children: [
                Container(
                  width: 2,
                  height: 14,
                  color: first ? Colors.transparent : AppColors.divider,
                ),
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: c.state == 'running' ? color : AppColors.surface,
                    shape: BoxShape.circle,
                    border: Border.all(color: color, width: 2.5),
                  ),
                ),
                Expanded(
                  child: Container(
                    width: 2,
                    color: last ? Colors.transparent : AppColors.divider,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: DashPanel(
                // A class off has nothing to mark; its make-up is the next step.
                onTap: c.state == 'cancelled'
                    ? _openMakeups
                    : () => _mark(c.batchId, c.batchName, today),
                border: c.needsMarking ? color.withValues(alpha: 0.45) : null,
                padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
                child: Opacity(
                  opacity: dim ? 0.65 : 1,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 4,
                            height: 34,
                            margin: const EdgeInsets.only(right: 10, top: 2),
                            decoration: BoxDecoration(
                              color: course,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c.batchName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTextStyles.labelLarge.copyWith(
                                      decoration: c.state == 'cancelled'
                                          ? TextDecoration.lineThrough
                                          : null,
                                    )),
                                Text(meta,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTextStyles.caption.copyWith(
                                        color: AppColors.textSecondary)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          if (c.isMakeup) ...[
                            const TagChip('Make-up',
                                color: makeupIndigo,
                                icon: Icons.event_repeat_rounded),
                            const SizedBox(width: 4),
                          ],
                          TagChip(label,
                              color: color,
                              icon: switch (c.state) {
                                'running' => Icons.sensors_rounded,
                                'not_marked' => Icons.error_outline_rounded,
                                'marked' => Icons.check_circle_rounded,
                                'cancelled' => Icons.event_busy_rounded,
                                _ => Icons.schedule_rounded,
                              }),
                        ],
                      ),
                      if (c.needsMarking) ...[
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: () =>
                                _mark(c.batchId, c.batchName, today),
                            icon:
                                const Icon(Icons.how_to_reg_rounded, size: 20),
                            label: const Text('Mark attendance'),
                            style: FilledButton.styleFrom(
                              backgroundColor: c.state == 'running'
                                  ? AppColors.teacherAccent
                                  : AppColors.error,
                              minimumSize: const Size.fromHeight(44),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------- to mark ---

  List<Widget> _toMark(bool compact) {
    final list = s.unmarked;
    if (list.isEmpty) {
      return [
        if (!compact) const HomeSection('To mark'),
        if (compact) const SizedBox(height: 10),
        const CalmLine(
          icon: Icons.task_alt_rounded,
          color: AppColors.success,
          text: 'All attendance marked ✓',
        ),
      ];
    }
    final shown = list.take(compact ? 3 : 5).toList();
    return [
      HomeSection('To mark',
          action: list.length > shown.length ? 'All ${list.length}' : null,
          onAction: () =>
              _push(const AttendanceTodayScreen(), reloadAfter: true)),
      RowsPanel(
        border: AppColors.error.withValues(alpha: 0.3),
        rows: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
            child: Row(
              children: [
                const Icon(Icons.pending_actions_rounded,
                    color: AppColors.error, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${list.length} ${list.length == 1 ? 'class is' : 'classes are'} waiting for attendance',
                    style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.error, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
          for (final u in shown)
            InfoRow(
              leading: u.date == null
                  ? const IconBubble(Icons.event_note_rounded, AppColors.error)
                  : DateBadge(u.date!, AppColors.error, size: 42),
              title: u.batchName,
              subtitle: [
                if (u.date != null) weekdayDay(u.date!),
                if (u.startTime.isNotEmpty) clock12(u.startTime),
                if (u.courseName.isNotEmpty) u.courseName,
              ].join(' · '),
              trailing: const Padding(
                padding: EdgeInsets.only(right: 6),
                child: TagChip('Mark', color: AppColors.error, solid: true),
              ),
              onTap: () => _mark(u.batchId, u.batchName, u.dateRaw),
            ),
        ],
      ),
    ];
  }

  // -------------------------------------------------------------- missing ---

  List<Widget> _missing() {
    final low = s.low;
    if (low.isEmpty) return const [];
    final shown = low.take(4).toList();
    return [
      HomeSection('Students missing classes',
          action: low.length > shown.length ? 'See all ${low.length}' : null,
          onAction: () => _push(_LowAttendancePage(students: low))),
      RowsPanel(rows: [
        if (s.attendancePercentage != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
            child: Row(
              children: [
                PercentRing(
                    percentage: s.attendancePercentage, size: 40, stroke: 5),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Overall attendance across ${s.attendanceClasses} classes in the last 30 days',
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        for (final st in shown) lowAttendanceRow(context, st),
      ]),
    ];
  }

  // ------------------------------------------------------------ birthdays ---

  List<Widget> _birthdays() {
    if (s.birthdays.isEmpty) return const [];
    return [
      const HomeSection('Birthdays this week'),
      RowsPanel(rows: [
        for (final b in s.birthdays)
          InfoRow(
            leading: IconBubble(Icons.cake_rounded,
                b.inDays == 0 ? AppColors.courseDance : AppColors.courseVocal),
            title: b.name,
            subtitle: [
              b.inDays == 0
                  ? 'Today!'
                  : b.inDays == 1
                      ? 'Tomorrow'
                      : (b.date == null
                          ? 'In ${b.inDays} days'
                          : weekdayDay(b.date!)),
              if (b.turns != null && b.turns! > 0) 'Turns ${b.turns}',
              if (b.parentName != null) b.parentName!,
            ].join(' · '),
            trailing: b.phone == null ? null : CallButton(b.phone!),
            onTap: () => _push(StudentAttendanceScreen(
                studentId: b.studentId, studentName: b.name)),
          ),
      ]),
    ];
  }

  // -------------------------------------------------------------- batches ---

  List<Widget> _batches() {
    if (s.batches.isEmpty) {
      return const [
        HomeSection('My batches'),
        CalmLine(
            icon: Icons.groups_2_outlined, text: 'No batches assigned yet.'),
      ];
    }
    return [
      HomeSection('My batches', action: 'Summary', onAction: _openTeaching),
      RowsPanel(rows: [
        for (final b in s.batches)
          InfoRow(
            leading: IconBubble(
                Icons.groups_2_rounded,
                b.courseName.isNotEmpty
                    ? AppColors.getCourseColor(b.courseName)
                    : AppColors.teacherAccent),
            title: b.name,
            subtitle: [
              if (b.courseName.isNotEmpty) b.courseName,
              ...b.timingLines,
            ].join('\n'),
            subtitleLines: 3,
            trailing: Padding(
              padding: const EdgeInsets.only(left: 6, right: 4),
              child: TagChip('${b.students}',
                  color: AppColors.teacherAccent, icon: Icons.person_rounded),
            ),
            onTap: () =>
                _push(BatchStudentsScreen(batchId: b.id, batchName: b.name)),
          ),
      ]),
    ];
  }

  // ------------------------------------------------------------ coming up ---

  List<Widget> _comingUp() {
    if (s.exams.isEmpty && s.events.isEmpty) return const [];
    return [
      const HomeSection('Coming up'),
      RowsPanel(rows: [
        for (final x in s.exams)
          InfoRow(
            leading: x.date == null
                ? const IconBubble(
                    Icons.workspace_premium_rounded, AppColors.warning)
                : DateBadge(x.date!, AppColors.warning, size: 42),
            title: x.name,
            subtitle: [
              if (x.course != null) x.course!,
              if (x.time != null) clock12(x.time),
              if (x.location != null) x.location!,
            ].join(' · '),
            onTap: () => _push(const GradeExamsListScreen()),
          ),
        for (final e in s.events)
          InfoRow(
            leading: e.date == null
                ? const IconBubble(
                    Icons.celebration_rounded, AppColors.courseDance)
                : DateBadge(e.date!, AppColors.courseDance, size: 42),
            title: e.title,
            subtitle: [
              'Event',
              if (e.time != null) clock12(e.time),
              if (e.location != null) e.location!,
            ].join(' · '),
            onTap: () => _push(const EventsListScreen()),
          ),
      ]),
    ];
  }

  // ----------------------------------------------------------------- week ---

  void _openWeek() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (sheet) => SafeArea(
        child: ConstrainedBox(
          constraints:
              BoxConstraints(maxHeight: MediaQuery.of(sheet).size.height * 0.7),
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            children: [
              const Text('Next 7 days', style: AppTextStyles.h4),
              const SizedBox(height: 10),
              if (s.week.isEmpty)
                Text('No classes in the next 7 days.',
                    style: AppTextStyles.bodyMedium
                        .copyWith(color: AppColors.textSecondary))
              else
                RowsPanel(rows: [
                  for (final c in s.week)
                    InfoRow(
                      leading: c.date == null
                          ? const IconBubble(
                              Icons.event_rounded, AppColors.teacherAccent)
                          : DateBadge(
                              c.date!,
                              c.cancelled
                                  ? AppColors.textHint
                                  : AppColors.getCourseColor(c.courseName),
                              size: 42),
                      title: c.batchName,
                      subtitle: [
                        c.dayWord(DateTime.now()),
                        c.timeRange,
                        if (c.cancelled)
                          'Cancelled'
                        else if (c.isMakeup)
                          'Make-up'
                        else if (c.place.isNotEmpty)
                          c.place,
                      ].join(' · '),
                      onTap: () {
                        Navigator.of(sheet).pop();
                        _push(BatchStudentsScreen(
                            batchId: c.batchId, batchName: c.batchName));
                      },
                    ),
                ]),
            ],
          ),
        ),
      ),
    );
  }

  static String _iso(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

/// One student who is missing classes: name, batch, how badly, call.
Widget lowAttendanceRow(BuildContext context, LowAttendanceStudent st) {
  final pct = st.percentage;
  final streak = st.missedInARow;
  return InfoRow(
    leading: Stack(
      clipBehavior: Clip.none,
      children: [
        InitialsAvatar(st.name, size: 40),
        Positioned(
          right: -3,
          bottom: -3,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
            decoration: BoxDecoration(
              color: attendanceColor(pct),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.surface, width: 1.5),
            ),
            child: Text(pct == null ? '–' : '$pct%',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w800)),
          ),
        ),
      ],
    ),
    title: st.name,
    subtitle: [
      streak >= 2
          ? 'Missed last $streak in a row'
          : 'Attended ${st.attended} of ${st.classes}',
      st.batchName,
    ].join(' · '),
    subtitleLines: 2,
    trailing: st.phone == null ? null : CallButton(st.phone!),
    onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => StudentAttendanceScreen(
            studentId: st.studentId, studentName: st.name))),
  );
}

class _LowAttendancePage extends StatelessWidget {
  final List<LowAttendanceStudent> students;
  const _LowAttendancePage({required this.students});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Students missing classes')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
              'Last 30 days, lowest attendance first. Tap a student for their record.',
              style: AppTextStyles.caption
                  .copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: 10),
          RowsPanel(
              rows: [for (final s in students) lowAttendanceRow(context, s)]),
        ],
      ),
    );
  }
}
