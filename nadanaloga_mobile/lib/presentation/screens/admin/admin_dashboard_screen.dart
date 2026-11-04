import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/utils/fee_format.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';
import '../../bloc/batch/batch_bloc.dart';
import '../../bloc/batch/batch_event.dart';
import '../../bloc/dashboard/dashboard_bloc.dart';
import '../../bloc/dashboard/dashboard_event.dart';
import '../../bloc/dashboard/dashboard_state.dart';
import 'fees/extra_bill_detail_screen.dart';
import 'fees/extra_bill_form_screen.dart';
import 'insights/dashboard_widgets.dart';
import 'insights/insights_data.dart';

/// Admin home: greeting, headline counts, today's classes, fees with a
/// 6-month trend, and tiles for everything that needs attention. Every tile
/// opens its list.
class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  AdminInsights? _insights;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadInsights();
  }

  Future<void> _loadInsights() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final d = await AdminInsights.load();
      if (!mounted) return;
      setState(() {
        _insights = d;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _refresh() async {
    context.read<DashboardBloc>().add(RefreshDashboardStats());
    await _loadInsights();
  }

  /// Opens [path] and refreshes the dashboard on return, since most lists
  /// let the admin act (mark attendance, place a student, ...).
  Future<void> _open(String path) async {
    await context.push(path);
    if (mounted) _loadInsights();
  }

  Future<void> _openPage(Widget page) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
    if (mounted) _loadInsights();
  }

  static String _greeting() {
    final h = FeeFormat.nowIst().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  static String _todayLabel() {
    final now = FeeFormat.nowIst();
    const w = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
      'Sunday',
    ];
    const m = [
      'January', 'February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December',
    ];
    return '${w[now.weekday - 1]}, ${now.day} ${m[now.month - 1]}';
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final user = authState is AuthAuthenticated ? authState.user : null;
        final isSuper = user?.isSuperAdmin == true;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Dashboard'),
            automaticallyImplyLeading: false,
            actions: [
              IconButton(
                tooltip: 'Notifications',
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () => context.push('/admin/notifications'),
              ),
              IconButton(
                tooltip: 'Sign out',
                icon: const Icon(Icons.logout),
                onPressed: () =>
                    context.read<AuthBloc>().add(AuthLogoutRequested()),
              ),
            ],
            bottom: _loading && _insights != null
                ? const PreferredSize(
                    preferredSize: Size.fromHeight(2),
                    child: LinearProgressIndicator(minHeight: 2),
                  )
                : null,
          ),
          body: RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                _header(user?.name, isSuper),
                const SizedBox(height: 16),
                _kpis(isSuper),
                const SizedBox(height: 22),
                ..._insightSections(),
                const SizedBox(height: 22),
                const DashSectionTitle('Quick actions'),
                _quickActions(),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _header(String? name, bool isSuper) {
    final first = (name ?? '').trim();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _todayLabel().toUpperCase(),
          style: AppTextStyles.caption.copyWith(
              letterSpacing: 0.8, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 2),
        Text(
          first.isEmpty ? _greeting() : '${_greeting()}, $first',
          style: AppTextStyles.h2,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        Text(isSuper ? 'Super Admin' : 'Administrator',
            style: AppTextStyles.bodySmall
                .copyWith(color: AppColors.textSecondary)),
      ],
    );
  }

  Widget _kpis(bool isSuper) {
    return BlocBuilder<DashboardBloc, DashboardState>(
      builder: (context, state) {
        if (state is DashboardError) {
          return DashPanel(
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: AppColors.error),
                const SizedBox(width: 10),
                Expanded(
                    child: Text(state.message,
                        style: AppTextStyles.bodySmall)),
                TextButton(
                  onPressed: () =>
                      context.read<DashboardBloc>().add(LoadDashboardStats()),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }
        final s = state is DashboardLoaded ? state.stats : null;
        String v(int? n) => n == null ? '–' : '$n';
        return KpiRow(items: [
          KpiItem('Students', v(s?.students), Icons.school_outlined,
              AppColors.studentAccent,
              () => context.push('/admin/drilldown/students')),
          KpiItem('Teachers', v(s?.teachers), Icons.person_outline,
              AppColors.teacherAccent,
              () => context.push('/admin/drilldown/teachers')),
          KpiItem('Batches', v(s?.batches), Icons.group_work_outlined,
              AppColors.primary,
              () => context.push('/admin/drilldown/batches')),
          KpiItem('Courses', v(s?.courses), Icons.menu_book_outlined,
              AppColors.secondaryDark, () => context.push('/admin/courses')),
          if (isSuper)
            KpiItem('Branches', v(s?.locations), Icons.location_on_outlined,
                AppColors.info, () => context.push('/admin/locations')),
        ]);
      },
    );
  }

  List<Widget> _insightSections() {
    final d = _insights;
    if (d == null) {
      if (_loading) {
        return const [
          Padding(
            padding: EdgeInsets.all(32),
            child: Center(child: CircularProgressIndicator()),
          ),
        ];
      }
      return [
        DashPanel(
          border: AppColors.error.withValues(alpha: 0.3),
          child: Row(
            children: [
              const Icon(Icons.cloud_off_outlined, color: AppColors.error),
              const SizedBox(width: 10),
              Expanded(
                child: Text(_error ?? 'Could not load.',
                    style: AppTextStyles.bodySmall),
              ),
              TextButton(onPressed: _loadInsights, child: const Text('Retry')),
            ],
          ),
        ),
      ];
    }

    final t = d.today;
    final running = t.classes.where((c) => c.state == 'running').length;
    final todaySub = t.classes.isEmpty
        ? null
        : '${t.classes.length} ${t.classes.length == 1 ? 'class' : 'classes'}${running > 0 ? ' · $running in class now' : ''}';

    final a = d.attendance;
    final j = d.joiners;
    final soonest = d.birthdays.students.isEmpty
        ? null
        : d.birthdays.students.first;
    final birthdayToday =
        d.birthdays.students.where((p) => p.i('in_days') == 0).length;

    String n(int c, String one, [String? many]) =>
        '$c ${c == 1 ? one : (many ?? '${one}s')}';

    return [
      DashSectionTitle(
        'Today',
        action: todaySub,
        onAction: todaySub == null
            ? null
            : () => context.push('/admin/drilldown/batches'),
      ),
      TodayStrip(
        today: t,
        onTap: (c) => _open('/admin/batches/${c.batchId}'),
      ),
      const SizedBox(height: 22),
      const DashSectionTitle('Fees'),
      FeesPanel(
        fees: d.fees,
        trend: d.trend,
        onTap: () => _open('/admin/insights/fees'),
      ),
      const SizedBox(height: 22),
      const DashSectionTitle('Needs attention'),
      AttentionGrid(items: [
        AttentionItem(
          icon: Icons.edit_calendar_outlined,
          title: 'Not marked',
          value: d.unmarked.count,
          context: d.unmarked.count == 0
              ? 'All attendance taken'
              : '${n(d.unmarked.count, 'class', 'classes')} this week',
          alert: d.unmarked.count > 0 ? AppColors.error : null,
          onTap: () => _open('/admin/insights/unmarked'),
        ),
        AttentionItem(
          icon: Icons.trending_down,
          title: 'Low attendance',
          value: a.count,
          context: a.count == 0
              ? 'Everyone attending'
              : 'Below ${a.threshold}% · ${a.days} days',
          alert: a.count > 0 ? AppColors.warning : null,
          onTap: () => _open('/admin/insights/attendance'),
        ),
        AttentionItem(
          icon: Icons.group_off_outlined,
          title: 'Not in a batch',
          value: d.notInBatch.studentsCount,
          context: d.notInBatch.studentsCount == 0
              ? 'Everyone placed'
              : 'Need a batch',
          alert: d.notInBatch.studentsCount > 0
              ? AppColors.studentAccent
              : null,
          onTap: () => _open('/admin/insights/not-in-batch'),
        ),
        AttentionItem(
          icon: Icons.contact_phone_outlined,
          title: 'Demo enquiries',
          value: d.demos.pending,
          context: d.demos.pending == 0
              ? 'None waiting'
              : d.demos.stale > 0
                  ? '${d.demos.stale} waiting long'
                  : 'Waiting for a call',
          alert: d.demos.pending > 0 ? AppColors.info : null,
          onTap: () => _open('/admin/insights/demos'),
        ),
        AttentionItem(
          icon: Icons.groups_2_outlined,
          title: 'Batch sizes',
          value: d.capacity.count,
          context: d.capacity.count == 0
              ? 'All healthy'
              : _capacitySummary(d.capacity),
          alert: d.capacity.batches.any((b) => b.state == 'over')
              ? AppColors.error
              : d.capacity.count > 0
                  ? AppColors.warning
                  : null,
          onTap: () => _open('/admin/insights/capacity'),
        ),
        AttentionItem(
          icon: Icons.person_add_alt,
          title: 'New this month',
          value: j.count,
          context: j.feeNotSet > 0
              ? '${j.feeNotSet} without a fee'
              : j.leavers.isNotEmpty
                  ? '${j.leavers.length} left'
                  : j.month,
          alert: j.feeNotSet > 0 ? AppColors.error : null,
          onTap: () => _open('/admin/insights/joiners'),
        ),
        AttentionItem(
          icon: Icons.cake_outlined,
          title: 'Birthdays',
          value: d.birthdays.count,
          context: soonest == null
              ? 'None this week'
              : birthdayToday > 0
                  ? '$birthdayToday today'
                  : 'Next ${_inDays(soonest.i('in_days'))}',
          alert: birthdayToday > 0 ? AppColors.secondaryDark : null,
          onTap: () => _open('/admin/insights/birthdays'),
        ),
        AttentionItem(
          icon: Icons.receipt_long_outlined,
          title: 'Extra bills',
          value: d.extraBills.length,
          context: d.extraBills.isEmpty
              ? 'None open'
              : '${FeeFormat.rupees(d.extraBills.fold<num>(0, (s, b) => s + b.dueAmount))} due',
          alert: d.extraBills.any((b) => b.dueAmount > 0)
              ? AppColors.warning
              : null,
          onTap: () => _open('/admin/insights/extra-bills'),
        ),
      ]),
      if (d.extraBills.isNotEmpty) ...[
        const SizedBox(height: 22),
        DashSectionTitle(
          'Extra bills',
          action: d.extraBills.length > 3 ? 'See all' : null,
          onAction: () => _open('/admin/insights/extra-bills'),
        ),
        ExtraBillsPanel(
          bills: d.extraBills,
          onTap: (b) => _openPage(ExtraBillDetailScreen(chargeId: b.id)),
        ),
      ],
    ];
  }

  static String _inDays(int d) => d <= 0
      ? 'today'
      : d == 1
          ? 'tomorrow'
          : 'in $d days';

  static String _capacitySummary(CapacityInsights c) {
    int k(String s) => c.batches.where((b) => b.state == s).length;
    final parts = <String>[
      if (k('over') > 0) '${k('over')} over',
      if (k('full') > 0) '${k('full')} full',
      if (k('empty') > 0) '${k('empty')} empty',
      if (k('small') > 0) '${k('small')} small',
    ];
    return parts.join(' · ');
  }

  Widget _quickActions() {
    return QuickActionsRow(actions: [
      QuickAction(Icons.person_add_alt_1, 'Add student', AppColors.studentAccent,
          () => context.push('/admin/users/add')),
      QuickAction(Icons.group_add_outlined, 'New batch', AppColors.primary,
          () async {
        final created = await context.push<bool>('/admin/batches/add');
        if (created == true && mounted) {
          context.read<BatchBloc>().add(LoadBatches());
          _loadInsights();
        }
      }),
      QuickAction(Icons.event_outlined, 'Add event', AppColors.info,
          () => context.push('/admin/events/add')),
      // One-off bills are raised only as extra bills.
      QuickAction(Icons.receipt_long_outlined, 'Extra bill', AppColors.success,
          () => _openPage(const ExtraBillFormScreen())),
    ]);
  }
}
