import 'package:flutter/material.dart';
import '../../../core/utils/greeting_name.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/fee_format.dart';
import '../../../data/models/notice_model.dart';
import '../../../di/injection_container.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';
import '../admin/insights/dashboard_widgets.dart';
import '../attendance/student_attendance_screen.dart';
import '../student/book_materials_list_screen.dart';
import '../student/events_list_screen.dart';
import '../student/grade_exams_list_screen.dart';
import '../student/household_fees_screen.dart';
import '../student/student_batches_screen.dart';
import '../student/students_profile_screen.dart';
import '../student/upi_payment_flow.dart';
import '../student/notices_list_screen.dart';
import '../student/teaching_summary_screen.dart';
import 'class_schedule.dart';
import 'dashboard_parts.dart';
import 'home_data.dart';
import 'home_summary.dart';
import 'home_widgets.dart';
import 'member_detail_screen.dart';
import 'teacher_home_sections.dart';

/// The home dashboard for everyone who is not an admin: a household (one phone
/// number) of students, and/or a teacher. Everything is shown at once, top to
/// bottom — no member switching, no sideways paging between people.
///
/// Family:
///   header      greeting · today's classes · fees due
///   fees        this month's bill for the whole family, one Pay button
///   birthdays   a banner when a child's birthday is within a week
///   teaching    (a teacher who is also a parent) today's classes, to mark
///   children    per child: next class, attendance, what was taught last
///   this week   the family's classes for the next 7 days
///   coming up   exams, events, notices, new study materials
///   shortcuts
///
/// Teacher (no students in the household): see [TeacherHomeSections].
class HomeDashboard extends StatefulWidget {
  final Color accent;
  final String notificationsRoute;

  /// Teachers have no "More" tab, so log out lives in the header.
  final bool showLogout;

  /// Change this to make the dashboard reload (e.g. after returning to the tab).
  final int refreshToken;

  /// Opens the Courses tab, when there is one.
  final VoidCallback? onOpenCourses;

  const HomeDashboard({
    super.key,
    required this.accent,
    required this.notificationsRoute,
    this.showLogout = false,
    this.refreshToken = 0,
    this.onOpenCourses,
  });

  @override
  State<HomeDashboard> createState() => _HomeDashboardState();
}

class _HomeDashboardState extends State<HomeDashboard> {
  HomeData? _data;
  bool _loading = true;

  /// GET /api/home/summary and /api/teacher/summary. Loaded alongside the
  /// household; each can fail on its own without hiding the fees.
  FamilySummary? _family;
  bool _familyFailed = false;
  TeacherSummary? _teaching;
  bool _teachingFailed = false;

  /// Signed-in user; "You teach" / teaching numbers only when this is the teacher.
  int? _viewerId;
  String? _viewerRole;

  bool _viewerTeaches(HomeData d) =>
      d.teacher != null && d.teacher!.id == _viewerId;

  bool get _isTeacherLogin =>
      (_viewerRole ?? '').trim().toLowerCase() == 'teacher';

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthBloc>().state;
    if (auth is AuthAuthenticated) {
      _viewerId = auth.user.id;
      _viewerRole = auth.user.role;
    }
    _load();
  }

  @override
  void didUpdateWidget(covariant HomeDashboard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshToken != widget.refreshToken) _load();
  }

  Future<void> _load() async {
    if (_data == null) setState(() => _loading = true);
    final api = sl<ApiClient>();
    final teacher = _isTeacherLogin;
    final results = await Future.wait<Object?>([
      HomeData.load(api),
      FamilySummary.load(api),
      if (teacher) TeacherSummary.load(api),
    ]);
    if (!mounted) return;
    setState(() {
      _data = results[0] as HomeData;
      _family = results[1] as FamilySummary?;
      _familyFailed = _family == null;
      if (teacher) {
        _teaching = results[2] as TeacherSummary?;
        _teachingFailed = _teaching == null;
      }
      _loading = false;
    });
  }

  bool get _failed {
    final d = _data;
    return d != null &&
        d.members.isEmpty &&
        d.teacher == null &&
        d.fees == null &&
        d.batches.isEmpty &&
        _family == null &&
        _teaching == null;
  }

  Future<void> _openFees() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const HouseholdFeesScreen()),
    );
    if (mounted) _load();
  }

  /// Home "Pay": straight to paying. While online payment is off that is the
  /// UPI sheet for every bill the family can pay (then the screenshot);
  /// with online payment on, the Fees screen holds the checkout.
  Future<void> _payNow() async {
    final d = _data;
    final fees = d?.fees;
    final bills = payableBills(fees);
    if (fees == null || fees['online_payments_enabled'] == true || bills.isEmpty) {
      await _openFees();
      return;
    }
    await payBillsByUpi(context, fees, bills);
    if (mounted) _load();
  }

  void _push(Widget screen) =>
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));

  // ---------------------------------------------------------------- build ---

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthBloc>().state;
    final user = auth is AuthAuthenticated ? auth.user : null;
    _viewerId = user?.id;
    _viewerRole = user?.role;
    final top = MediaQuery.of(context).padding.top;
    final d = _data;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      // Light icons over the coloured header; no bar colours (deprecated on Android 15).
      value: const SystemUiOverlayStyle(
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: RefreshIndicator(
          onRefresh: _load,
          edgeOffset: top,
          child: ListView(
            padding: EdgeInsets.zero,
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              _header(user?.name ?? '', d),
              Transform.translate(
                offset: const Offset(0, -28),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_loading && d == null)
                        ..._skeleton()
                      else if (_failed)
                        _errorCard()
                      else if (d!.students.isEmpty && d.teacher != null)
                        ..._teacherSections(d)
                      else
                        ..._sections(d),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ------------------------------------------------------------- teacher ---

  TeacherHomeSections? _teacherBuilder(HomeData d) {
    final s = _teaching;
    if (s == null || d.teacher == null) return null;
    return TeacherHomeSections(
      context: context,
      s: s,
      teacherId: d.teacher!.id,
      teacherName: d.teacher!.name,
      reload: _load,
      notificationsRoute: widget.notificationsRoute,
    );
  }

  List<Widget> _teacherSections(HomeData d) {
    final b = _teacherBuilder(d);
    if (b == null) {
      // The summary could not load: keep the old batch list so the teacher
      // can still reach her students, and offer a retry.
      return [
        SectionError(
            text: "Couldn't load today's classes.", onRetry: _load),
        const SizedBox(height: 4),
        HomeSectionTitle('My batches',
            action: d.teachingBatches.isEmpty ? null : 'See all',
            onAction: () => _push(TeachingSummaryScreen(
                teacherId: d.teacher!.id, teacherName: d.teacher!.name))),
        ..._teachingBatchTiles(d),
        const SizedBox(height: 12),
      ];
    }
    return [...b.build(), const SizedBox(height: 16)];
  }

  // -------------------------------------------------------------- family ---

  List<Widget> _sections(HomeData d) {
    final fam = _family;
    final teaching = _viewerTeaches(d) ? _teacherBuilder(d) : null;
    final birthdays = [
      for (final c in fam?.children ?? const <ChildSummary>[])
        if (c.birthday != null && c.birthday!.inDays <= 7) c,
    ]..sort((a, b) => a.birthday!.inDays.compareTo(b.birthday!.inDays));

    return [
      if (d.students.isNotEmpty) _feeCard(d),
      if (d.partial)
        Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Text(
            'Some details could not be loaded. Pull down to refresh.',
            style: AppTextStyles.caption.copyWith(color: AppColors.error),
            textAlign: TextAlign.center,
          ),
        ),
      for (final c in birthdays)
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: BirthdayBanner(
            name: c.name,
            inDays: c.birthday!.inDays,
            turns: c.birthday!.turns,
            date: c.birthday!.date,
            onTap: () => _openMember(d, c.id),
          ),
        ),
      if (teaching != null) ...teaching.build(compact: true),
      if (_viewerTeaches(d) && teaching == null && _teachingFailed) ...[
        const SizedBox(height: 12),
        SectionError(text: "Couldn't load your teaching today.", onRetry: _load),
      ],
      ..._childrenSection(d),
      ..._weekSection(d),
      ..._comingUp(d),
      const HomeSection('Shortcuts'),
      QuickGrid(actions: _familyActions(d)),
      if (d.students.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 20),
          child: Text(
            'Fees are billed on the 1st of every month and are due by the 10th.',
            textAlign: TextAlign.center,
            style: AppTextStyles.caption.copyWith(color: AppColors.textHint),
          ),
        ),
      const SizedBox(height: 12),
    ];
  }

  Future<void> _openMember(HomeData d, int id) async {
    HouseholdMember? m;
    for (final s in d.students) {
      if (s.id == id) m = s;
    }
    if (m == null) return;
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => MemberDetailScreen(member: m!, data: d, accent: widget.accent),
    ));
    if (mounted) _load();
  }

  String? _courseNameById(HomeData d, int? id) {
    for (final c in d.courses) {
      if (c.id == id) return c.name;
    }
    return null;
  }

  /// The Batches page (class days, times, teacher, place) for [students].
  void _openBatches(HomeData d, List<HouseholdMember> students) {
    _push(StudentBatchesScreen(
      sections: [
        for (final s in students)
          BatchSection(name: s.name, batches: d.batchesOf(s.id)),
      ],
      isLoading: false,
      onRefresh: () {},
      courseNameOf: (id) => _courseNameById(d, id),
    ));
  }

  void _openAttendanceOf(int id, String name) =>
      _push(StudentAttendanceScreen(studentId: id, studentName: name));

  /// One child opens straight away; with several, ask whose.
  Future<void> _pickAttendance(HomeData d) async {
    final students = d.students;
    if (students.isEmpty) return;
    if (students.length == 1) {
      _openAttendanceOf(students.first.id, students.first.name);
      return;
    }
    final chosen = await showModalBottomSheet<HouseholdMember>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text('Whose attendance?', style: AppTextStyles.h4),
            ),
            for (final s in students)
              ListTile(
                leading: InitialsAvatar(s.name, size: 40, photoUrl: s.photoUrl),
                title: Text(s.name),
                subtitle: s.courseLabels.isEmpty
                    ? null
                    : Text(s.courseLabels.join(', ')),
                onTap: () => Navigator.pop(sheet, s),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (chosen != null && mounted) _openAttendanceOf(chosen.id, chosen.name);
  }

  List<Widget> _childrenSection(HomeData d) {
    final students = d.students;
    final teacherTile = d.teacher != null && students.isNotEmpty;
    if (students.isEmpty) return const [];
    final title = students.length == 1 && !students.first.isChild
        ? 'My classes'
        : students.length == 1
            ? '${greetingName(students.first.name)}\'s classes'
            : 'Your children';
    return [
      HomeSection(title),
      if (_family == null && _familyFailed) ...[
        SectionError(
            text: "Couldn't load classes and attendance.", onRetry: _load),
        const SizedBox(height: 10),
        for (final m in students) _memberTile(m, d),
      ] else
        for (var i = 0; i < students.length; i++)
          Padding(
            padding: EdgeInsets.only(top: i == 0 ? 0 : 12),
            child: _childCard(d, students[i], _family?.child(students[i].id)),
          ),
      if (teacherTile) ...[
        const SizedBox(height: 12),
        _memberTile(d.teacher!, d),
      ],
    ];
  }

  Widget _childCard(HomeData d, HouseholdMember m, ChildSummary? c) {
    final f = d.feesFor(m.id);
    final Widget? pill = f.due > 0
        ? StatusPill('${FeeFormat.rupees(f.due)} due', color: AppColors.warning)
        : f.allPaid
            ? const StatusPill('Paid',
                color: AppColors.success, icon: Icons.check_rounded)
            : null;
    final courses = m.courseLabels.isNotEmpty ? m.courseLabels : (c?.courses ?? const []);
    final hasBatch = d.batchesOf(m.id).isNotEmpty || (c?.batches.isNotEmpty ?? false);

    return DashPanel(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Who: photo, name, courses, fee status → details.
          InkWell(
            onTap: () => _openMember(d, m.id),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 8, 10),
              child: Row(
                children: [
                  InitialsAvatar(m.name, photoUrl: m.photoUrl),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(m.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTextStyles.labelLarge
                                      .copyWith(fontWeight: FontWeight.w700)),
                            ),
                            if (pill != null) ...[const SizedBox(width: 8), pill],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          courses.isEmpty ? 'No courses yet' : courses.join(' · '),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.caption
                              .copyWith(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: AppColors.textHint),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: c == null
                ? const SkeletonBlock(110)
                : c.nextClass != null
                    ? NextClassHero(
                        cls: c.nextClass!,
                        onTap: () => _openBatches(d, [m]),
                      )
                    : _noClassBox(
                        hasBatch
                            ? 'No classes in the next 7 days'
                            : 'Awaiting batch — class timings will show here once the academy assigns one',
                        onTap: hasBatch ? () => _openBatches(d, [m]) : null),
          ),
          if (c != null) ...[
            _attendanceRow(m, c),
            if (c.lastNote != null) ...[
              const Divider(height: 1, indent: 14, endIndent: 14, color: AppColors.divider),
              _noteRow(m, c.lastNote!),
            ],
          ] else
            const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _noClassBox(String text, {VoidCallback? onTap}) {
    return Material(
      color: AppColors.background,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              const IconBubble(Icons.event_available_rounded, AppColors.textSecondary,
                  size: 36),
              const SizedBox(width: 10),
              Expanded(
                child: Text(text,
                    style: AppTextStyles.bodySmall
                        .copyWith(color: AppColors.textSecondary)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _attendanceRow(HouseholdMember m, ChildSummary c) {
    final useMonth = c.month.classes > 0 || c.last90.classes == 0;
    final a = useMonth ? c.month : c.last90;
    final none = a.classes == 0;
    final color = attendanceColor(a.percentage);
    final caption = [
      none
          ? 'No classes marked yet'
          : 'Attended ${a.attended} of ${a.classes} ${a.classes == 1 ? 'class' : 'classes'}',
      // Early in the month a single class swings the number; give the longer view.
      if (useMonth && c.last90.classes > a.classes && c.last90.percentage != null)
        '${c.last90.percentage}% over 90 days',
    ].join(' · ');
    return InkWell(
      onTap: () => _openAttendanceOf(m.id, m.name),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
        child: Row(
          children: [
            PercentRing(percentage: none ? null : a.percentage, size: 54, stroke: 6),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          useMonth ? 'Attendance this month' : 'Attendance · 90 days',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.labelLarge,
                        ),
                      ),
                      if (!none && a.percentage != null && a.percentage! < 70) ...[
                        const SizedBox(width: 6),
                        Icon(Icons.warning_amber_rounded, size: 16, color: color),
                      ],
                    ],
                  ),
                  Text(caption,
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary)),
                  if (c.recent.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    AttendanceDots(recent: c.recent),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textHint),
          ],
        ),
      ),
    );
  }

  Widget _noteRow(HouseholdMember m, ClassNote n) {
    final missed = n.status == 'absent';
    return InkWell(
      onTap: () => _openAttendanceOf(m.id, m.name),
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 8, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const IconBubble(Icons.menu_book_rounded, AppColors.info, size: 36),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        n.date == null
                            ? 'What was taught'
                            : 'What was taught on ${shortDay(n.date!)}',
                        style: AppTextStyles.labelLarge,
                      ),
                      if (missed)
                        const TagChip('Missed this class',
                            color: AppColors.error, icon: Icons.close_rounded),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(n.note,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.bodySmall
                          .copyWith(color: AppColors.textPrimary)),
                  if (n.batchName.isNotEmpty)
                    Text(n.batchName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textHint)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textHint),
          ],
        ),
      ),
    );
  }

  List<Widget> _weekSection(HomeData d) {
    final fam = _family;
    if (fam == null || d.students.isEmpty) return const [];
    final week = fam.week;
    if (week.isEmpty) return const [];
    return [
      HomeSection('This week',
          action: 'Timetable', onAction: () => _openBatches(d, d.students)),
      WeekStrip(
        classes: week,
        showLearners: d.students.length > 1,
        onTap: (_) => _openBatches(d, d.students),
      ),
    ];
  }

  List<Widget> _comingUp(HomeData d) {
    final fam = _family;
    if (fam == null) return _comingUpSection(d);
    final firstStudentId = d.students.isEmpty ? null : d.students.first.id;
    final rows = <Widget>[
      for (final x in fam.exams.take(3))
        InfoRow(
          leading: x.date == null
              ? const IconBubble(Icons.workspace_premium_rounded, AppColors.warning)
              : DateBadge(x.date!, AppColors.warning, size: 42),
          title: x.name,
          subtitle: [
            if (x.course != null) x.course!,
            if (x.time != null) clock12(x.time),
            if (x.location != null) x.location!,
          ].join(' · '),
          onTap: () => _push(GradeExamsListScreen(studentId: firstStudentId)),
        ),
      for (final e in fam.events.take(3))
        InfoRow(
          leading: e.date == null
              ? const IconBubble(Icons.celebration_rounded, AppColors.courseDance)
              : DateBadge(e.date!, AppColors.courseDance, size: 42),
          title: e.title,
          subtitle: [
            'Event',
            if (e.time != null) clock12(e.time),
            if (e.location != null) e.location!,
          ].join(' · '),
          onTap: () => _push(const EventsListScreen()),
        ),
      for (final n in fam.notices.take(3))
        InfoRow(
          leading: IconBubble(Icons.campaign_rounded,
              n.isHigh ? AppColors.error : AppColors.info, size: 42),
          title: n.title,
          subtitle: [
            'Notice',
            if (n.isHigh) 'Important',
            if (n.createdAt != null) shortDay(n.createdAt!),
          ].join(' · '),
          onTap: () => _push(const NoticesListScreen()),
        ),
      if (fam.newMaterials > 0)
        InfoRow(
          leading: const IconBubble(Icons.auto_stories_rounded, AppColors.teacherAccent,
              size: 42),
          title:
              '${fam.newMaterials} new study ${fam.newMaterials == 1 ? 'material' : 'materials'}',
          subtitle: 'Added in the last 30 days',
          onTap: () => _push(BookMaterialsListScreen(studentId: firstStudentId)),
        ),
    ];
    return [
      const HomeSection('Coming up'),
      if (rows.isEmpty)
        const CalmLine(
          icon: Icons.celebration_outlined,
          text: 'Nothing new. Exams, events and notices will show here.',
        )
      else
        RowsPanel(rows: rows),
    ];
  }

  List<HomeAction> _familyActions(HomeData d) {
    final firstStudentId = d.students.isEmpty ? null : d.students.first.id;
    final due = d.monthDue || d.otherDue > 0;
    final materials = _family?.newMaterials ?? 0;
    return [
      HomeAction(Icons.account_balance_wallet_rounded, 'Fees', AppColors.success,
          _openFees,
          badge: due && !d.allVerifying ? '!' : null),
      HomeAction(Icons.fact_check_rounded, 'Attendance', AppColors.teacherAccent,
          () => _pickAttendance(d)),
      HomeAction(Icons.calendar_month_rounded, 'Classes', AppColors.primary,
          () => _openBatches(d, d.students)),
      HomeAction(Icons.auto_stories_rounded, 'Materials', AppColors.courseVocal,
          () => _push(BookMaterialsListScreen(studentId: firstStudentId)),
          badge: materials > 0 ? '$materials' : null),
      HomeAction(Icons.workspace_premium_rounded, 'Exams', AppColors.warning,
          () => _push(GradeExamsListScreen(studentId: firstStudentId))),
      HomeAction(Icons.celebration_rounded, 'Events', AppColors.courseDance,
          () => _push(const EventsListScreen())),
      HomeAction(Icons.campaign_rounded, 'Notices', AppColors.info,
          () => _push(const NoticesListScreen())),
      HomeAction(Icons.badge_rounded, 'Profiles', AppColors.studentAccent,
          () => _push(const StudentsProfileScreen())),
    ];
  }

  // --------------------------------------------------------------- header ---

  Widget _header(String fullName, HomeData? d) {
    final now = DateTime.now();
    final hour = now.hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 17
            ? 'Good afternoon'
            : 'Good evening';
    final firstName = greetingName(fullName);
    const weekdays = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December'
    ];
    final dateLine =
        '${weekdays[now.weekday - 1]}, ${now.day} ${months[now.month - 1]}';

    String summary = '';
    if (d != null && !_failed) {
      final teacherOnly = d.students.isEmpty && d.teacher != null;
      final int today;
      if (teacherOnly && _teaching != null) {
        today = _teaching!.today.where((c) => c.state != 'cancelled').length;
      } else if (_family != null) {
        today = _family!.week
                .where((c) => !c.cancelled && c.dayWord(now) == 'Today')
                .length +
            (_viewerTeaches(d) && _teaching != null
                ? _teaching!.today.where((c) => c.state != 'cancelled').length
                : 0);
      } else {
        today = d.upcomingClasses
            .where((s) => ClassSchedule.dayLabel(s.start) == 'Today')
            .length;
      }
      final toMark = _viewerTeaches(d) ? (_teaching?.unmarked.length ?? 0) : 0;
      final parts = <String>[
        today == 0
            ? 'No classes today'
            : '$today ${today == 1 ? 'class' : 'classes'} today',
        if (toMark > 0) '$toMark to mark',
        if (d.students.isNotEmpty && (d.hasBill || d.otherDue > 0))
          d.monthDue
              ? (d.allVerifying
                  ? 'Payment being verified'
                  : '${FeeFormat.rupees(d.totalDue + d.otherDue)} due')
              : d.otherDue > 0
                  ? '${FeeFormat.rupees(d.otherDue)} due'
                  : 'Fees paid',
      ];
      summary = parts.join('  ·  ');
    }

    final accent = widget.accent;
    return Container(
      padding: EdgeInsets.fromLTRB(
          20, MediaQuery.of(context).padding.top + 12, 8, 48),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [accent, Color.lerp(accent, AppColors.primary, 0.55)!],
        ),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            right: 24,
            top: 40,
            child: Icon(Icons.music_note_rounded,
                size: 96, color: Colors.white.withValues(alpha: 0.07)),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                      border: Border.all(
                          color: Colors.white.withValues(alpha: 0.35), width: 1.5),
                    ),
                    child: Text(
                      InitialsAvatar.initials(fullName),
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 17),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(greeting,
                            style: AppTextStyles.bodySmall
                                .copyWith(color: Colors.white70)),
                        Text(
                          firstName.isEmpty ? 'Welcome' : firstName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.h3.copyWith(
                              color: Colors.white, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Notifications',
                    icon: const Icon(Icons.notifications_outlined,
                        color: Colors.white),
                    onPressed: () => context.push(widget.notificationsRoute),
                  ),
                  if (widget.showLogout)
                    IconButton(
                      tooltip: 'Log out',
                      icon: const Icon(Icons.logout, color: Colors.white),
                      onPressed: () =>
                          context.read<AuthBloc>().add(AuthLogoutRequested()),
                    ),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  const Icon(Icons.calendar_today_rounded,
                      size: 13, color: Colors.white70),
                  const SizedBox(width: 6),
                  Text(dateLine,
                      style:
                          AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                summary,
                style: AppTextStyles.bodyLarge
                    .copyWith(color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ----------------------------------------------------------------- fees ---

  Widget _feeCard(HomeData d) {
    final month = d.period.split(' ').first;

    if (!d.hasBill && d.otherDue <= 0) {
      return HomeCard(
        onTap: _openFees,
        child: Row(
          children: [
            _roundIcon(Icons.receipt_long_outlined, AppColors.textSecondary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('No fees for ${d.period} yet',
                      style: AppTextStyles.labelLarge),
                  Text('Bills are generated on the 1st of every month.',
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textHint),
          ],
        ),
      );
    }

    if (d.allPaid && d.otherDue <= 0) {
      return HomeCard(
        onTap: _openFees,
        borderColor: AppColors.success.withValues(alpha: 0.35),
        child: Row(
          children: [
            _roundIcon(Icons.check_rounded, AppColors.success),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('All paid for $month',
                      style: AppTextStyles.labelLarge),
                  Text('${FeeFormat.rupees(d.totalPaid)} paid · View receipts',
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textHint),
          ],
        ),
      );
    }

    final due = d.dueDate;
    final today = DateTime.now();
    final daysLeft = due?.difference(DateTime(today.year, today.month, today.day)).inDays;
    String? statusLabel;
    Color statusColor = AppColors.info;
    if (d.allVerifying) {
      statusLabel = 'Being verified';
      statusColor = AppColors.info;
    } else if (daysLeft != null) {
      if (daysLeft < 0) {
        statusLabel = 'Overdue by ${-daysLeft} ${-daysLeft == 1 ? 'day' : 'days'}';
        statusColor = AppColors.error;
      } else if (daysLeft == 0) {
        statusLabel = 'Due today';
        statusColor = AppColors.warning;
      } else {
        statusLabel = 'Due in $daysLeft ${daysLeft == 1 ? 'day' : 'days'}';
        statusColor = daysLeft <= 3 ? AppColors.warning : AppColors.info;
      }
    }
    final students = d.students;
    // Only extra bills / earlier months are left when this month is clear.
    final onlyOther = !d.monthDue;
    final payable = payableBills(d.fees);

    return HomeCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(onlyOther ? 'Other dues' : '$month fees',
                    style: AppTextStyles.bodyMedium
                        .copyWith(color: AppColors.textSecondary)),
              ),
              if (statusLabel != null)
                StatusPill(statusLabel, color: statusColor),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            FeeFormat.rupees(onlyOther ? d.otherDue : d.totalDue),
            style: AppTextStyles.h1.copyWith(
                fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
          Text(
            onlyOther
                ? [
                    d.hasBill ? '$month fees paid' : 'No fees for $month yet',
                    '${d.otherBills} ${d.otherBills == 1 ? 'bill' : 'bills'}: costumes, uniforms…',
                  ].join('  ·  ')
                : [
                    if (due != null)
                      'Pay by ${FeeFormat.shortDate(d.fees?['due_date'] as String?)}',
                    if (d.totalVerifying > 0) '${FeeFormat.rupees(d.totalVerifying)} being verified',
                    if (d.totalPaid > 0) '${FeeFormat.rupees(d.totalPaid)} already paid',
                  ].join('  ·  '),
            style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
          ),
          if (!onlyOther && d.otherDue > 0)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '+ ${FeeFormat.rupees(d.otherDue)} other dues (costumes, uniforms…)',
                style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textPrimary, fontWeight: FontWeight.w600),
              ),
            ),
          if (students.length > 1 && !onlyOther) ...[
            const SizedBox(height: 12),
            const Divider(height: 1, color: AppColors.divider),
            const SizedBox(height: 6),
            for (final s in students)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(
                  children: [
                    InitialsAvatar(s.name, size: 26, photoUrl: s.photoUrl),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(s.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.bodyMedium),
                    ),
                    _feeStatusText(d.feesFor(s.id)),
                  ],
                ),
              ),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  // Pay goes straight to paying; Details opens the bill list.
                  // Pays every payable bill (this month + other dues);
                  // nothing payable means it is all waiting to be verified.
                  onPressed: payable.isEmpty ? null : _payNow,
                  style: FilledButton.styleFrom(
                    backgroundColor: widget.accent,
                    minimumSize: const Size.fromHeight(46),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(payable.isEmpty
                      ? 'Being verified'
                      : uploadOnly(d.fees)
                          ? 'Upload screenshot · ${FeeFormat.rupees(billsTotal(payable))}'
                          : 'Pay ${FeeFormat.rupees(billsTotal(payable))}'),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton(
                onPressed: _openFees,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 46),
                  foregroundColor: widget.accent,
                  side: BorderSide(color: widget.accent.withValues(alpha: 0.4)),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Details'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _feeStatusText(MemberFees f) {
    if (f.due > 0) {
      return Text('${FeeFormat.rupees(f.due)} due',
          style: AppTextStyles.labelLarge.copyWith(color: AppColors.textPrimary));
    }
    if (f.allPaid) {
      return Text('Paid',
          style: AppTextStyles.labelLarge.copyWith(color: AppColors.success));
    }
    return Text('No bill',
        style: AppTextStyles.caption.copyWith(color: AppColors.textHint));
  }

  // -------------------------------------------------------------- family ---

  Widget _memberTile(HouseholdMember m, HomeData d) {
    final Widget? pill;
    final String line1;
    final String line2;
    final IconData line2Icon;
    final VoidCallback onTap;

    if (m.isTeacher) {
      final n = d.teachingBatches.length;
      line1 = 'Teaching · $n ${n == 1 ? 'batch' : 'batches'} · '
          '${_count(d.studentsTaught, 'student')}';
      final weekly = ClassSchedule.weeklyClassCount(d.teachingBatches);
      line2 = '$weekly ${weekly == 1 ? 'class' : 'classes'} a week';
      line2Icon = Icons.event_repeat_outlined;
      pill = const StatusPill('Teacher', color: AppColors.teacherAccent);
      onTap = () => _push(
          TeachingSummaryScreen(teacherId: m.id, teacherName: m.name));
    } else {
      final labels = m.courseLabels;
      line1 = labels.isEmpty ? 'No courses yet' : labels.take(3).join('\n');
      final batches = d.batchesOf(m.id).map((b) => b.batchName).toList();
      line2 = batches.isEmpty ? 'Awaiting batch' : batches.join(', ');
      line2Icon = batches.isEmpty ? Icons.hourglass_empty : Icons.groups_2_outlined;
      final f = d.feesFor(m.id);
      pill = f.due > 0
          ? StatusPill('${FeeFormat.rupees(f.due)} due', color: AppColors.warning)
          : f.allPaid
              ? const StatusPill('Paid',
                  color: AppColors.success, icon: Icons.check_rounded)
              : null;
      onTap = () async {
        await Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => MemberDetailScreen(
            member: m,
            data: d,
            accent: widget.accent,
          ),
        ));
        if (mounted) _load();
      };
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: HomeCard(
        onTap: onTap,
        padding: const EdgeInsets.fromLTRB(14, 14, 8, 14),
        child: Row(
          children: [
            InitialsAvatar(m.name, photoUrl: m.photoUrl),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(m.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.labelLarge
                                .copyWith(fontWeight: FontWeight.w600)),
                      ),
                      if (pill != null) ...[const SizedBox(width: 8), pill],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(line1,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.bodySmall
                          .copyWith(color: AppColors.textPrimary)),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Icon(line2Icon, size: 14, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(line2,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.caption
                                .copyWith(color: AppColors.textSecondary)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textHint),
          ],
        ),
      ),
    );
  }

  List<Widget> _teachingBatchTiles(HomeData d) {
    final batches = d.teachingBatches;
    if (batches.isEmpty) {
      return const [
        HomeEmptyLine(
            icon: Icons.groups_2_outlined, text: 'No batches assigned yet.'),
      ];
    }
    return [
      for (final b in batches.take(4))
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: HomeCard(
            onTap: () => _push(TeachingSummaryScreen(
                teacherId: d.teacher!.id, teacherName: d.teacher!.name)),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(b.batchName, style: AppTextStyles.labelLarge),
                      Text(
                        [
                          d.courseNameOf(b),
                          ...ClassSchedule.timingLines(b).take(2),
                        ].where((x) => x.isNotEmpty).join(' · '),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                StatusPill(_count(b.allStudentIds.length, 'student'),
                    color: AppColors.teacherAccent),
              ],
            ),
          ),
        ),
    ];
  }

  // ----------------------------------------------------------- coming up ---

  List<Widget> _comingUpSection(HomeData d) {
    final dated = d.comingUp.take(3).toList();
    final notices = d.latestNotices.take(2).toList();
    final firstStudentId = d.students.isEmpty ? null : d.students.first.id;
    final rows = <Widget>[
      for (final item in dated)
        _updateRow(
          leading: _dateBlock(item.date!,
              item.kind == ComingUpKind.exam ? AppColors.warning : AppColors.primary),
          title: item.title,
          subtitle: [
            item.kind == ComingUpKind.exam ? 'Exam' : 'Event',
            if (item.detail.isNotEmpty) item.detail,
          ].join(' · '),
          onTap: () => _push(item.kind == ComingUpKind.exam
              ? GradeExamsListScreen(studentId: firstStudentId)
              : const EventsListScreen()),
        ),
      for (final NoticeModel n in notices)
        _updateRow(
          leading: _roundIcon(Icons.campaign_outlined, AppColors.info),
          title: n.title,
          subtitle: [
            'Notice',
            if (n.createdAt != null && n.createdAt!.length >= 10)
              FeeFormat.shortDate(n.createdAt),
          ].join(' · '),
          onTap: () => _push(const NoticesListScreen()),
        ),
    ];

    return [
      const HomeSectionTitle('Coming up'),
      if (rows.isEmpty)
        const HomeEmptyLine(
          icon: Icons.celebration_outlined,
          text: 'Nothing new. Events, exams and notices will show here.',
        )
      else
        HomeCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (var i = 0; i < rows.length; i++) ...[
                if (i > 0)
                  const Divider(
                      height: 1, indent: 16, endIndent: 16, color: AppColors.divider),
                rows[i],
              ],
            ],
          ),
        ),
    ];
  }

  Widget _updateRow({
    required Widget leading,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            leading,
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.labelLarge),
                  Text(subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textHint),
          ],
        ),
      ),
    );
  }

  Widget _dateBlock(DateTime date, Color color) {
    const months = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
    ];
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('${date.day}',
              style: TextStyle(
                  color: color, fontWeight: FontWeight.w700, fontSize: 16, height: 1.1)),
          Text(months[date.month - 1],
              style: TextStyle(
                  color: color, fontWeight: FontWeight.w600, fontSize: 9, height: 1.1)),
        ],
      ),
    );
  }

  // ------------------------------------------------------------- helpers ---

  Widget _roundIcon(IconData icon, Color color) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, color: color, size: 22),
    );
  }

  // ------------------------------------------------------------- helpers ---

  static String _count(int n, String one) => '$n ${n == 1 ? one : '${one}s'}';

  List<Widget> _skeleton() {
    Widget block(double h) => Container(
          height: h,
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.divider),
          ),
        );
    return [block(170), block(92), block(200), block(160)];
  }

  Widget _errorCard() {
    return HomeCard(
      child: Column(
        children: [
          const Icon(Icons.cloud_off_outlined, size: 36, color: AppColors.textHint),
          const SizedBox(height: 8),
          const Text('Could not load your dashboard', style: AppTextStyles.labelLarge),
          Text('Check your internet connection and try again.',
              textAlign: TextAlign.center,
              style:
                  AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: 8),
          TextButton(onPressed: _load, child: const Text('Try again')),
        ],
      ),
    );
  }
}
