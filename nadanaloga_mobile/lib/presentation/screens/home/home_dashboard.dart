import 'package:flutter/material.dart';
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
import '../student/events_list_screen.dart';
import '../student/grade_exams_list_screen.dart';
import '../student/household_fees_screen.dart';
import '../student/notices_list_screen.dart';
import '../student/teaching_summary_screen.dart';
import 'class_schedule.dart';
import 'home_data.dart';
import 'home_widgets.dart';
import 'member_detail_screen.dart';

/// The home dashboard for everyone who is not an admin: a household (one phone
/// number) of students, and/or a teacher. Everything is shown at once, top to
/// bottom — no member switching, no sideways scrolling.
///
///   header      greeting · today's classes · fees due
///   fees        this month's bill for the whole family, one Pay button
///   at a glance three fixed tiles (teaching or learning numbers)
///   this week   the next classes across the family and the teaching timetable
///   family      one row per person (courses, batch, fee status) → details
///   coming up   events, exams and notices in one short list
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
  bool _showAllClasses = false;

  /// Signed-in user; "You teach" / teaching numbers only when this is the teacher.
  int? _viewerId;

  bool _viewerTeaches(HomeData d) =>
      d.teacher != null && d.teacher!.id == _viewerId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant HomeDashboard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshToken != widget.refreshToken) _load();
  }

  Future<void> _load() async {
    if (_data == null) setState(() => _loading = true);
    final data = await HomeData.load(sl<ApiClient>());
    if (!mounted) return;
    setState(() {
      _data = data;
      _loading = false;
    });
  }

  bool get _failed {
    final d = _data;
    return d != null &&
        d.members.isEmpty &&
        d.teacher == null &&
        d.fees == null &&
        d.batches.isEmpty;
  }

  Future<void> _openFees() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const HouseholdFeesScreen()),
    );
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
    final top = MediaQuery.of(context).padding.top;
    final d = _data;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
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
                      else
                        ..._sections(d!),
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

  List<Widget> _sections(HomeData d) {
    final family = <HouseholdMember>[
      if (d.teacher != null) d.teacher!,
      ...d.students,
    ];
    return [
      if (d.students.isNotEmpty) _feeCard(d) else _glance(d),
      if (d.partial)
        Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Text(
            'Some details could not be loaded. Pull down to refresh.',
            style: AppTextStyles.caption.copyWith(color: AppColors.error),
            textAlign: TextAlign.center,
          ),
        ),
      if (d.students.isNotEmpty) ...[
        const SizedBox(height: 12),
        _glance(d),
      ],
      ..._classesSection(d),
      if (family.length > 1) ...[
        const HomeSectionTitle('Your family'),
        for (final m in family) _memberTile(m, d),
      ] else if (d.students.length == 1) ...[
        const HomeSectionTitle('My courses'),
        _memberTile(d.students.first, d),
      ] else if (d.teacher != null) ...[
        HomeSectionTitle('My batches',
            action: d.teachingBatches.isEmpty ? null : 'See all',
            onAction: () => _push(TeachingSummaryScreen(
                teacherId: d.teacher!.id, teacherName: d.teacher!.name))),
        ..._teachingBatchTiles(d),
      ],
      ..._comingUpSection(d),
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

  // --------------------------------------------------------------- header ---

  Widget _header(String fullName, HomeData? d) {
    final now = DateTime.now();
    final hour = now.hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 17
            ? 'Good afternoon'
            : 'Good evening';
    final firstName = fullName.trim().split(RegExp(r'\s+')).first;
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
      final today = d.upcomingClasses
          .where((s) => ClassSchedule.dayLabel(s.start) == 'Today')
          .length;
      final parts = <String>[
        today == 0
            ? 'No classes today'
            : '$today ${today == 1 ? 'class' : 'classes'} today',
        if (d.students.isNotEmpty && d.hasBill)
          d.allPaid ? 'Fees paid' : '${FeeFormat.rupees(d.totalDue)} due',
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
      child: Column(
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
          Text(dateLine,
              style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
          const SizedBox(height: 2),
          Text(
            summary,
            style: AppTextStyles.bodyLarge
                .copyWith(color: Colors.white, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  // ----------------------------------------------------------------- fees ---

  Widget _feeCard(HomeData d) {
    final month = d.period.split(' ').first;

    if (!d.hasBill) {
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

    if (d.allPaid) {
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
    if (daysLeft != null) {
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

    return HomeCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('$month fees',
                    style: AppTextStyles.bodyMedium
                        .copyWith(color: AppColors.textSecondary)),
              ),
              if (statusLabel != null)
                StatusPill(statusLabel, color: statusColor),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            FeeFormat.rupees(d.totalDue),
            style: AppTextStyles.h1.copyWith(
                fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
          Text(
            [
              if (due != null)
                'Pay by ${FeeFormat.shortDate(d.fees?['due_date'] as String?)}',
              if (d.totalPaid > 0) '${FeeFormat.rupees(d.totalPaid)} already paid',
            ].join('  ·  '),
            style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
          ),
          if (students.length > 1) ...[
            const SizedBox(height: 12),
            const Divider(height: 1, color: AppColors.divider),
            const SizedBox(height: 6),
            for (final s in students)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(
                  children: [
                    InitialsAvatar(s.name, size: 26),
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
                  onPressed: _openFees,
                  style: FilledButton.styleFrom(
                    backgroundColor: widget.accent,
                    minimumSize: const Size.fromHeight(46),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text('Pay ${FeeFormat.rupees(d.totalDue)}'),
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

  // ----------------------------------------------------------- at a glance ---

  static String _count(int n, String one) => '$n ${n == 1 ? one : '${one}s'}';

  static const _singular = {
    'Courses': 'Course',
    'Batches': 'Batch',
    'Students': 'Student',
  };

  Widget _glance(HomeData d) {
    final tiles = _viewerTeaches(d) || d.students.isEmpty
        ? [
            _Tile(Icons.groups_2_outlined, '${d.teachingBatches.length}',
                'Batches', AppColors.teacherAccent, null),
            _Tile(Icons.people_outline, '${d.studentsTaught}', 'Students',
                AppColors.primary, null),
            _Tile(
                Icons.event_repeat_outlined,
                '${ClassSchedule.weeklyClassCount(d.teachingBatches)}',
                'Classes/week',
                AppColors.studentAccent,
                null),
          ]
        : [
            _Tile(
                Icons.menu_book_outlined,
                '${d.students.fold<int>(0, (n, s) => n + s.courseLabels.length)}',
                'Courses',
                AppColors.studentAccent,
                widget.onOpenCourses),
            _Tile(Icons.groups_2_outlined, '${d.learningBatches.length}',
                'Batches', AppColors.teacherAccent, widget.onOpenCourses),
            _Tile(
                Icons.event_repeat_outlined,
                '${ClassSchedule.weeklyClassCount(d.learningBatches)}',
                'Classes/week',
                AppColors.primary,
                null),
          ];
    return Row(
      children: [
        for (var i = 0; i < tiles.length; i++) ...[
          if (i > 0) const SizedBox(width: 10),
          Expanded(child: _tile(tiles[i])),
        ],
      ],
    );
  }

  Widget _tile(_Tile t) {
    return HomeCard(
      onTap: t.onTap,
      padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(t.icon, size: 22, color: t.color),
          const SizedBox(height: 8),
          Text(t.value,
              style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.w700)),
          Text(t.value == '1' ? (_singular[t.label] ?? t.label) : t.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style:
                  AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  // ------------------------------------------------------------- classes ---

  List<Widget> _classesSection(HomeData d) {
    final sessions = d.upcomingClasses;
    final visible = _showAllClasses ? sessions : sessions.take(4).toList();
    final hasBatches =
        d.learningBatches.isNotEmpty || d.teachingBatches.isNotEmpty;

    return [
      HomeSectionTitle(
        'This week',
        action: sessions.length > 4
            ? (_showAllClasses ? 'Show less' : 'See all ${sessions.length}')
            : null,
        onAction: () => setState(() => _showAllClasses = !_showAllClasses),
      ),
      if (sessions.isEmpty)
        HomeEmptyLine(
          icon: Icons.event_available_outlined,
          text: hasBatches
              ? 'No classes in the next 7 days.'
              : d.students.isNotEmpty
                  ? 'Awaiting batch. Class timings will show here once the academy assigns one.'
                  : 'No batches assigned yet.',
        )
      else
        HomeCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (var i = 0; i < visible.length; i++) ...[
                if (i > 0)
                  const Divider(
                      height: 1, indent: 16, endIndent: 16, color: AppColors.divider),
                _classRow(visible[i],
                    isNext: i == 0,
                    viewerTeaches: _viewerTeaches(d),
                    // Label teaching vs. learning only when the family has both.
                    mixed: d.students.isNotEmpty,
                    teacherName: d.teacher?.name ?? ''),
              ],
            ],
          ),
        ),
    ];
  }

  Widget _classRow(ClassSession s,
      {required bool isNext,
      required bool viewerTeaches,
      required bool mixed,
      required String teacherName}) {
    final day = ClassSchedule.dayLabel(s.start);
    final isToday = day == 'Today';
    final color = s.courseName.isNotEmpty
        ? AppColors.getCourseColor(s.courseName)
        : widget.accent;
    final teacherFirst = teacherName.trim().split(RegExp(r'\s+')).first;
    final who = [
      if (s.learners.isNotEmpty) s.learners.join(' & '),
      if (s.teaching)
        viewerTeaches
            ? (mixed
                ? 'You teach · ${_count(s.batch.allStudentIds.length, 'student')}'
                : _count(s.batch.allStudentIds.length, 'student'))
            : '$teacherFirst teaches',
    ].join(' · ');
    final subtitle = [
      if (s.courseName.isNotEmpty &&
          s.courseName.toLowerCase() != s.batch.batchName.toLowerCase())
        s.courseName,
      if (who.isNotEmpty) who,
      if (s.batch.mode != null && s.batch.mode!.isNotEmpty) s.batch.mode!,
    ].join(' · ');

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          SizedBox(
            width: 78,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  day,
                  style: AppTextStyles.caption.copyWith(
                    color: isToday ? widget.accent : AppColors.textSecondary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  s.hasTime
                      ? ClassSchedule.clock(s.start.hour * 60 + s.start.minute)
                      : 'Time TBA',
                  style: AppTextStyles.bodySmall.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary),
                ),
              ],
            ),
          ),
          Container(
            width: 4,
            height: 38,
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(s.batch.batchName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTextStyles.labelLarge),
                if (subtitle.isNotEmpty)
                  Text(subtitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary)),
              ],
            ),
          ),
          if (isNext && isToday)
            StatusPill('Next', color: widget.accent)
          else if (s.teaching && viewerTeaches && mixed)
            const StatusPill('Teaching', color: AppColors.teacherAccent),
        ],
      ),
    );
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
            InitialsAvatar(m.name),
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
          Text('Could not load your dashboard', style: AppTextStyles.labelLarge),
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

class _Tile {
  final IconData icon;
  final String value;
  final String label;
  final Color color;
  final VoidCallback? onTap;

  const _Tile(this.icon, this.value, this.label, this.color, this.onTap);
}
