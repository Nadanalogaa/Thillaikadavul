import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/book_material_model.dart';
import '../../../data/models/course_model.dart';
import '../../../data/models/event_model.dart';
import '../../../data/models/grade_exam_model.dart';
import '../../../data/models/invoice_model.dart';
import '../../../data/models/location_model.dart';
import '../../../data/models/notice_model.dart';
import '../../../data/models/user_model.dart';
import '../../../di/injection_container.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_state.dart';
import '../../widgets/stat_card.dart';

class StudentDashboardScreen extends StatefulWidget {
  final List<BatchModel> batches;
  final List<CourseModel> courses;
  final List<InvoiceModel> invoices;
  final bool isLoading;
  final String? error;
  final VoidCallback onRefresh;
  final UserModel? student;
  final void Function(int invoiceId) onOpenFees;

  const StudentDashboardScreen({
    super.key,
    required this.batches,
    required this.courses,
    required this.invoices,
    required this.isLoading,
    this.error,
    required this.onRefresh,
    this.student,
    required this.onOpenFees,
  });

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  LocationModel? _location;
  final _apiClient = sl<ApiClient>();
  bool _loadingHighlights = false;
  String? _highlightsError;
  List<EventModel> _events = [];
  List<NoticeModel> _notices = [];
  List<BookMaterialModel> _materials = [];
  List<GradeExamModel> _exams = [];

  @override
  void initState() {
    super.initState();
    _loadLocationIfNeeded();
    _loadHighlights();
  }

  @override
  void didUpdateWidget(covariant StudentDashboardScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.student?.id != widget.student?.id) {
      _loadHighlights();
    }
  }

  Future<void> _loadLocationIfNeeded() async {
    final state = context.read<AuthBloc>().state;
    if (state is AuthAuthenticated && state.user.preferredLocationId != null) {
      try {
        final apiClient = sl<ApiClient>();
        final response = await apiClient.getLocations();
        if (mounted && response.statusCode == 200 && response.data is List) {
          final locations = (response.data as List)
              .map((l) => LocationModel.fromJson(l))
              .toList();
          final match = locations
              .where((l) => l.id == state.user.preferredLocationId)
              .toList();
          if (match.isNotEmpty) {
            setState(() => _location = match.first);
          }
        }
      } catch (_) {}
    }
  }

  Future<void> _loadHighlights() async {
    final state = context.read<AuthBloc>().state;
    if (state is! AuthAuthenticated) return;
    final studentId = widget.student?.id ?? state.user.id;

    setState(() {
      _loadingHighlights = true;
      _highlightsError = null;
    });

    try {
      final results = await Future.wait([
        _apiClient.getEvents(),
        _apiClient.getNotices(),
        _apiClient.getBookMaterials(),
        _apiClient.getGradeExams(),
      ]);

      if (!mounted) return;

      // Events
      final eventsResponse = results[0];
      _events = eventsResponse.statusCode == 200 && eventsResponse.data is List
          ? (eventsResponse.data as List)
              .map((e) => EventModel.fromJson(e))
              .where((e) => e.isActive)
              .toList()
          : <EventModel>[];

      // Notices
      final noticesResponse = results[1];
      _notices = noticesResponse.statusCode == 200 && noticesResponse.data is List
          ? (noticesResponse.data as List)
              .map((n) => NoticeModel.fromJson(n))
              .where((n) => n.isActive)
              .toList()
          : <NoticeModel>[];

      // Materials (filter by recipientIds if provided)
      final materialsResponse = results[2];
      _materials = materialsResponse.statusCode == 200 && materialsResponse.data is List
          ? (materialsResponse.data as List)
              .map((m) => BookMaterialModel.fromJson(m))
              .where((m) =>
                  m.recipientIds == null ||
                  m.recipientIds!.isEmpty ||
                  m.recipientIds!.contains(studentId))
              .toList()
          : <BookMaterialModel>[];

      // Exams (filter by recipientIds if provided)
      final examsResponse = results[3];
      _exams = examsResponse.statusCode == 200 && examsResponse.data is List
          ? (examsResponse.data as List)
              .map((e) => GradeExamModel.fromJson(e))
              .where((e) =>
                  e.recipientIds == null ||
                  e.recipientIds!.isEmpty ||
                  e.recipientIds!.contains(studentId))
              .toList()
          : <GradeExamModel>[];

      setState(() => _loadingHighlights = false);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingHighlights = false;
        _highlightsError = 'Failed to load updates';
      });
    }
  }

  int get _pendingFees =>
      widget.invoices.where((i) => i.status == 'pending').length;

  int get _overdueFees =>
      widget.invoices.where((i) => i.status == 'overdue').length;

  double get _totalPendingAmount => widget.invoices
      .where((i) => i.status == 'pending' || i.status == 'overdue')
      .fold(0.0, (sum, i) => sum + (i.amount ?? 0));

  bool get _hasFeesDueThisMonth {
    final now = DateTime.now();
    return widget.invoices.any((i) {
      if (i.status != 'pending') return false;
      if (i.dueDate == null) return true;
      try {
        final dueDate = DateTime.parse(i.dueDate!);
        return dueDate.month == now.month && dueDate.year == now.year;
      } catch (_) {
        return false;
      }
    });
  }

  List<InvoiceModel> get _urgentFees {
    final now = DateTime.now();
    return widget.invoices.where((i) {
      if (i.status != 'pending') return false;
      return now.day >= 1 && now.day <= 7;
    }).toList();
  }

  bool _isInCurrentMonth(String? dateStr) {
    if (dateStr == null) return false;
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      return date.month == now.month && date.year == now.year;
    } catch (_) {
      return false;
    }
  }

  InvoiceModel? get _currentMonthInvoice {
    final pending = widget.invoices.where((i) {
      if (i.status == 'paid') return false;
      return _isInCurrentMonth(i.dueDate) || _isInCurrentMonth(i.issueDate);
    }).toList();
    if (pending.isNotEmpty) return pending.first;

    final paid = widget.invoices.where((i) {
      if (i.status != 'paid') return false;
      return _isInCurrentMonth(i.paymentDate) ||
          _isInCurrentMonth(i.dueDate) ||
          _isInCurrentMonth(i.issueDate);
    }).toList();
    if (paid.isNotEmpty) return paid.first;
    return null;
  }

  // Get unique courses from batches
  List<CourseModel> get _enrolledCourses {
    final uniqueCourseIds = <int>{};
    final courses = <CourseModel>[];

    for (final batch in widget.batches) {
      if (batch.courseId != null && !uniqueCourseIds.contains(batch.courseId)) {
        uniqueCourseIds.add(batch.courseId!);
        final course = widget.courses.firstWhere(
          (c) => c.id == batch.courseId,
          orElse: () => CourseModel(id: batch.courseId!, name: batch.batchName),
        );
        courses.add(course);
      }
    }

    return courses;
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final user = state is AuthAuthenticated ? state.user : null;
        // Use student data if provided (parent viewing), otherwise use authenticated user (student viewing own)
        final displayUser = widget.student ?? user;

        return Scaffold(
          body: RefreshIndicator(
            onRefresh: () async {
              widget.onRefresh();
              await _loadLocationIfNeeded();
              await _loadHighlights();
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _DashboardHeaderCard(
                    name: displayUser?.name ?? 'Student',
                    studentId: displayUser?.userId,
                    classPreference: displayUser?.classPreference,
                  ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.05, end: 0),
                  const SizedBox(height: 20),

                  // Batch Status - Show "Batch Pending" if no batches
                  if (widget.batches.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.info.withValues(alpha: 0.15),
                            AppColors.info.withValues(alpha: 0.05),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.info.withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.schedule, size: 48, color: AppColors.info),
                          const SizedBox(height: 12),
                          Text(
                            'Batch Assignment Pending',
                            style: AppTextStyles.h3.copyWith(color: AppColors.info),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Your batch will be assigned soon by the admin.\nYou will be notified once assigned.',
                            style: AppTextStyles.bodyMedium.copyWith(
                              color: AppColors.textSecondary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                            onPressed: () {}, // TODO: Contact support
                            icon: const Icon(Icons.support_agent),
                            label: const Text('Contact Support'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.info,
                              side: BorderSide(color: AppColors.info),
                            ),
                          ),
                        ],
                      ),
                    ).animate(delay: 150.ms).fadeIn().slideY(begin: -0.1, end: 0),

                  // Urgent Fees Section (only if batches exist)
                  if (widget.batches.isNotEmpty && _urgentFees.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Urgent: Fees Due (Pay by 7th)',
                      style: AppTextStyles.h3.copyWith(color: AppColors.error),
                    ),
                    const SizedBox(height: 12),
                    ..._urgentFees.map((invoice) => Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: AppColors.warning.withValues(alpha: 0.3)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.payment, color: AppColors.warning, size: 28),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        invoice.courseName ?? 'Fee Payment',
                                        style: AppTextStyles.bodyLarge.copyWith(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      Text(
                                        '₹${invoice.amount ?? 0}',
                                        style: AppTextStyles.h3.copyWith(
                                          color: AppColors.warning,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton.icon(
                              onPressed: () => widget.onOpenFees(invoice.id),
                              icon: const Icon(Icons.payment, size: 20),
                              label: const Text('Pay Now'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.secondary,
                                foregroundColor: Colors.black,
                                minimumSize: const Size(double.infinity, 48),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )).toList(),
                  ],

                  if (widget.batches.isNotEmpty)
                    const SizedBox(height: 24),

                  // Stats Carousel
                  if (widget.isLoading)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else if (widget.error != null)
                    Card(
                      color: AppColors.error.withValues(alpha: 0.1),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: AppColors.error),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(widget.error!, style: AppTextStyles.bodyMedium),
                            ),
                            TextButton(
                              onPressed: widget.onRefresh,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    SizedBox(
                      height: 110,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          SizedBox(
                            width: 240,
                            child: StatCard(
                              title: 'My Batches',
                              value: '${widget.batches.length}',
                              icon: Icons.group_work,
                              color: AppColors.primary,
                              animationIndex: 0,
                            ),
                          ),
                          const SizedBox(width: 12),
                          SizedBox(
                            width: 240,
                            child: StatCard(
                              title: 'Courses',
                              value: '${_enrolledCourses.length}',
                              icon: Icons.menu_book,
                              color: AppColors.secondary,
                              animationIndex: 1,
                            ),
                          ),
                          const SizedBox(width: 12),
                          SizedBox(
                            width: 240,
                            child: StatCard(
                              title: 'Pending Fees',
                              value: '$_pendingFees',
                              icon: Icons.receipt_long,
                              color: _pendingFees > 0 ? AppColors.warning : AppColors.success,
                              animationIndex: 2,
                            ),
                          ),
                          if (_overdueFees > 0) ...[
                            const SizedBox(width: 12),
                            SizedBox(
                              width: 240,
                              child: StatCard(
                                title: 'Overdue',
                                value: '$_overdueFees',
                                icon: Icons.warning_amber,
                                color: AppColors.error,
                                animationIndex: 3,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  const SizedBox(height: 24),

                  // Branch Info
                  if (_location != null) ...[
                    Text('Your Branch', style: AppTextStyles.h4)
                        .animate(delay: 300.ms)
                        .fadeIn(),
                    const SizedBox(height: 8),
                    _BranchCard(location: _location!),
                    const SizedBox(height: 24),
                  ],

                  // Upcoming Classes / Schedule Preview
                  if (widget.batches.isNotEmpty) ...[
                    Text('Fees This Month', style: AppTextStyles.h4)
                        .animate(delay: 430.ms)
                        .fadeIn(),
                    const SizedBox(height: 12),
                    _MonthlyFeeCard(
                      invoice: _currentMonthInvoice,
                      onPayNow: (invoiceId) => widget.onOpenFees(invoiceId),
                    ),
                    const SizedBox(height: 24),
                    Text('Your Schedule', style: AppTextStyles.h4)
                        .animate(delay: 450.ms)
                        .fadeIn(),
                    const SizedBox(height: 12),
                    ...widget.batches.take(3).map((batch) => _ScheduleCard(batch: batch)),
                  ],

                  const SizedBox(height: 24),
                  _SectionHeader(
                    title: 'Recent Updates',
                    subtitle: 'Events, notices, exams, materials',
                  ),
                  const SizedBox(height: 12),
                  if (_loadingHighlights)
                    const _LoadingCard(message: 'Loading updates...')
                  else if (_highlightsError != null)
                    _EmptyStateCard(
                      icon: Icons.cloud_off,
                      title: 'Unable to load updates',
                      message: _highlightsError!,
                    )
                  else ...[
                    _SectionSubheader(title: 'Events'),
                    if (_events.isEmpty)
                      const _EmptyStateCard(
                        icon: Icons.event_busy,
                        title: 'No events',
                        message: 'Check back later for upcoming events.',
                      )
                    else
                      ..._events.take(2).map((e) => _InfoCard(
                            icon: Icons.event,
                            color: AppColors.primary,
                            title: e.title,
                            subtitle: _compactLine([
                              e.eventDate ?? 'Date TBA',
                              e.eventTime,
                              e.location,
                            ]),
                          )),
                    const SizedBox(height: 12),
                    _SectionSubheader(title: 'Notices'),
                    if (_notices.isEmpty)
                      const _EmptyStateCard(
                        icon: Icons.notifications_off,
                        title: 'No notices',
                        message: 'You are all caught up.',
                      )
                    else
                      ..._notices.take(2).map((n) => _InfoCard(
                            icon: Icons.campaign,
                            color: AppColors.info,
                            title: n.title,
                            subtitle: _compactLine([
                              n.category,
                              n.priority,
                            ]),
                          )),
                    const SizedBox(height: 12),
                    _SectionSubheader(title: 'Exams'),
                    if (_exams.isEmpty)
                      const _EmptyStateCard(
                        icon: Icons.quiz_outlined,
                        title: 'No exams',
                        message: 'Upcoming exams will appear here.',
                      )
                    else
                      ..._exams.take(2).map((e) => _InfoCard(
                            icon: Icons.quiz,
                            color: AppColors.warning,
                            title: e.examName,
                            subtitle: _compactLine([
                              e.examDate ?? 'Date TBA',
                              e.examTime,
                              e.course,
                            ]),
                          )),
                    const SizedBox(height: 12),
                    _SectionSubheader(title: 'Materials'),
                    if (_materials.isEmpty)
                      const _EmptyStateCard(
                        icon: Icons.menu_book_outlined,
                        title: 'No materials',
                        message: 'New materials will show up here.',
                      )
                    else
                      ..._materials.take(2).map((m) => _InfoCard(
                            icon: Icons.auto_stories,
                            color: AppColors.secondary,
                            title: m.title,
                            subtitle: _compactLine([
                              m.course,
                              m.fileType,
                            ]),
                          )),
                  ],

                  // Info Card
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.info.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline,
                            size: 18, color: AppColors.info),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Fees are due on the 1st of every month. Please pay between the 1st and 7th to avoid late fees.',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ).animate(delay: 500.ms).fadeIn(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _FeeAlertBanner extends StatelessWidget {
  final double pendingAmount;
  final bool isOverdue;

  const _FeeAlertBanner({
    required this.pendingAmount,
    required this.isOverdue,
  });

  @override
  Widget build(BuildContext context) {
    final color = isOverdue ? AppColors.error : AppColors.warning;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            color.withValues(alpha: 0.15),
            color.withValues(alpha: 0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isOverdue ? Icons.warning_amber_rounded : Icons.payments_outlined,
              color: color,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isOverdue ? 'Fees Overdue!' : 'Fees Due',
                  style: AppTextStyles.labelLarge.copyWith(
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Total: ₹${pendingAmount.toStringAsFixed(0)}',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right,
            color: color.withValues(alpha: 0.6),
          ),
        ],
      ),
    );
  }
}

class _MonthlyFeeCard extends StatelessWidget {
  final InvoiceModel? invoice;
  final void Function(int invoiceId) onPayNow;

  const _MonthlyFeeCard({
    required this.invoice,
    required this.onPayNow,
  });

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (invoice == null) {
      return _EmptyStateCard(
        icon: Icons.check_circle_outline,
        title: 'No fees for this month',
        message: 'You are all caught up.',
      );
    }

    final status = invoice!.status;
    final isPaid = status == 'paid';
    final color = isPaid ? AppColors.success : AppColors.warning;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isPaid ? Icons.check_circle : Icons.payments_outlined,
              color: color,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isPaid ? 'Paid for this month' : 'Payment due',
                  style: AppTextStyles.labelLarge.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '₹${(invoice!.amount ?? 0).toStringAsFixed(0)}',
                  style: AppTextStyles.h4.copyWith(color: color),
                ),
                if (isPaid && invoice!.paymentDate != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Paid on ${_formatDate(invoice!.paymentDate!)}',
                    style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                  ),
                ],
                if (!isPaid && invoice!.dueDate != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Pay by ${_formatDate(invoice!.dueDate!)}',
                    style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                  ),
                ],
              ],
            ),
          ),
          if (!isPaid)
            ElevatedButton(
              onPressed: () => onPayNow(invoice!.id),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Pay Now'),
            ),
        ],
      ),
    );
  }
}

class _DashboardHeaderCard extends StatelessWidget {
  final String name;
  final String? studentId;
  final String? classPreference;

  const _DashboardHeaderCard({
    required this.name,
    required this.studentId,
    required this.classPreference,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.studentAccent.withValues(alpha: 0.14),
            AppColors.studentAccent.withValues(alpha: 0.04),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.studentAccent.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.studentAccent.withValues(alpha: 0.2),
                child: Text(
                  name.isNotEmpty ? name.trim()[0].toUpperCase() : 'S',
                  style: AppTextStyles.h3.copyWith(color: AppColors.studentAccent),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Welcome, $name', style: AppTextStyles.h3),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        if (studentId != null)
                          _MiniTag(
                            label: 'ID: $studentId',
                            color: AppColors.studentAccent,
                          ),
                        if (classPreference != null)
                          _MiniTag(
                            label: classPreference!,
                            color: AppColors.info,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniTag extends StatelessWidget {
  final String label;
  final Color color;

  const _MiniTag({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: AppTextStyles.labelSmall.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

String _compactLine(List<String?> parts) {
  return parts
      .where((p) => p != null && p!.trim().isNotEmpty)
      .map((p) => p!.trim())
      .join(' • ');
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;

  const _SectionHeader({required this.title, this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: AppTextStyles.h4),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(
            subtitle!,
            style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ],
    );
  }
}

class _SectionSubheader extends StatelessWidget {
  final String title;

  const _SectionSubheader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: AppTextStyles.labelLarge.copyWith(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  final String message;

  const _LoadingCard({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.info.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.info.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          const SizedBox(
            height: 18,
            width: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: AppTextStyles.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyStateCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;

  const _EmptyStateCard({
    required this.icon,
    required this.title,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.info.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.info.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.info.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.info, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTextStyles.labelLarge),
                const SizedBox(height: 2),
                Text(
                  message,
                  style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;

  const _InfoCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTextStyles.labelLarge,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle.isEmpty ? 'Details coming soon' : subtitle,
                  style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BranchCard extends StatelessWidget {
  final LocationModel location;

  const _BranchCard({required this.location});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.info.withValues(alpha: 0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.info.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.location_city, color: AppColors.info, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    location.name,
                    style: AppTextStyles.labelLarge.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (location.city != null)
                    Text(
                      location.city!,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate(delay: 320.ms).fadeIn().slideX(begin: 0.05, end: 0);
  }
}

class _CourseCard extends StatelessWidget {
  final String courseName;
  final BatchModel? batch;
  final int index;

  const _CourseCard({
    required this.courseName,
    this.batch,
    required this.index,
  });

  IconData _courseIcon(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('bharatanatyam') || lower.contains('dance')) {
      return Icons.sports_gymnastics;
    }
    if (lower.contains('vocal') || lower.contains('music') ||
        lower.contains('western')) {
      return Icons.music_note;
    }
    if (lower.contains('veena') || lower.contains('instrument')) {
      return Icons.piano;
    }
    if (lower.contains('drawing') || lower.contains('art')) {
      return Icons.palette;
    }
    if (lower.contains('abacus') || lower.contains('math')) {
      return Icons.calculate;
    }
    if (lower.contains('phonics') || lower.contains('language')) {
      return Icons.abc;
    }
    return Icons.school;
  }

  @override
  Widget build(BuildContext context) {
    final color = AppColors.getCourseColor(courseName);
    final hasAssignment = batch != null;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color.withValues(alpha: 0.2)),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(_courseIcon(courseName), color: color, size: 24),
        ),
        title: Text(
          courseName,
          style: AppTextStyles.bodyLarge.copyWith(
            fontWeight: FontWeight.w500,
          ),
        ),
        subtitle: Text(
          hasAssignment
              ? 'Batch: ${batch!.batchName}'
              : 'Batch assignment pending',
          style: AppTextStyles.caption.copyWith(
            color: hasAssignment ? AppColors.success : AppColors.warning,
          ),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: hasAssignment
                ? AppColors.success.withValues(alpha: 0.1)
                : AppColors.warning.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            hasAssignment ? 'Active' : 'Pending',
            style: AppTextStyles.labelSmall.copyWith(
              color: hasAssignment ? AppColors.success : AppColors.warning,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    )
        .animate(delay: Duration(milliseconds: 370 + (index * 50)))
        .fadeIn(duration: 300.ms)
        .slideX(begin: 0.05, end: 0);
  }
}

class _ScheduleCard extends StatelessWidget {
  final BatchModel batch;

  const _ScheduleCard({required this.batch});

  String _formatSchedule(List<BatchScheduleEntry> schedule) {
    if (schedule.isEmpty) return 'Schedule not set';
    return schedule
        .where((s) => s.timing != null && s.timing!.isNotEmpty)
        .map((s) => s.timing!)
        .take(2)
        .join(', ');
  }

  @override
  Widget build(BuildContext context) {
    final scheduleText = _formatSchedule(batch.schedule);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.schedule, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    batch.batchName,
                    style: AppTextStyles.labelLarge.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    scheduleText,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.info.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                batch.mode ?? 'N/A',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.info,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyCoursesCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Icon(
              Icons.library_books_outlined,
              size: 48,
              color: AppColors.studentAccent.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 12),
            Text(
              'No Courses Selected',
              style: AppTextStyles.h3,
            ),
            const SizedBox(height: 8),
            Text(
              'Contact the admin to get enrolled in courses.',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
