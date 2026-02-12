import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:io';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../data/models/user_model.dart';
import '../../../data/models/invoice_model.dart';
import '../../../core/network/api_client.dart';
import '../../../di/injection_container.dart';
import '../../bloc/parent/parent_bloc.dart';
import '../../bloc/parent/parent_event.dart';
import '../../bloc/parent/parent_state.dart';

class ParentStudentDetailScreen extends StatefulWidget {
  final int studentId;
  final UserModel? student;

  const ParentStudentDetailScreen({
    super.key,
    required this.studentId,
    this.student,
  });

  @override
  State<ParentStudentDetailScreen> createState() =>
      _ParentStudentDetailScreenState();
}

class _ParentStudentDetailScreenState extends State<ParentStudentDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _imagePicker = ImagePicker();
  final _apiClient = sl<ApiClient>();
  bool _uploadingReceipt = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    // Load additional data (batches, fees, etc.)
    context.read<ParentBloc>().add(LoadStudentData(widget.studentId));
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }

  String _calculateYearsStudying(String? dateOfJoining) {
    if (dateOfJoining == null) return '';
    try {
      final joinDate = DateTime.parse(dateOfJoining);
      final today = DateTime.now();
      final years = today.year - joinDate.year;
      final months = today.month - joinDate.month;

      if (years == 0) {
        return months == 0
            ? 'Just joined'
            : '$months month${months > 1 ? 's' : ''}';
      }
      if (months < 0) {
        return '${years - 1} year${years - 1 > 1 ? 's' : ''}';
      }
      return '$years year${years > 1 ? 's' : ''}';
    } catch (_) {
      return '';
    }
  }

  bool _isPaymentDue(InvoiceModel invoice) {
    if (invoice.status != 'pending') return false;
    final now = DateTime.now();
    return now.day >= 1 && now.day <= 5;
  }

  void _showPaymentOptions(InvoiceModel invoice) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Choose Payment Method',
              style: AppTextStyles.h3,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Amount: ₹${invoice.amount ?? 0}',
              style: AppTextStyles.bodyLarge.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            _buildPaymentButton(
              'Google Pay',
              Icons.account_balance_wallet,
              const Color(0xFF4285F4),
              () => _openPaymentApp('gpay', invoice),
            ),
            const SizedBox(height: 12),
            _buildPaymentButton(
              'PhonePe',
              Icons.phone_android,
              const Color(0xFF5F259F),
              () => _openPaymentApp('phonepe', invoice),
            ),
            const SizedBox(height: 12),
            _buildPaymentButton(
              'CRED',
              Icons.credit_card,
              const Color(0xFF000000),
              () => _openPaymentApp('cred', invoice),
            ),
            const SizedBox(height: 12),
            _buildPaymentButton(
              'Upload Receipt',
              Icons.upload_file,
              AppColors.secondary,
              () {
                Navigator.pop(context);
                _uploadReceipt(invoice);
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentButton(String label, IconData icon, Color color, VoidCallback onTap) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white),
              const SizedBox(width: 12),
              Text(
                label,
                style: AppTextStyles.button.copyWith(color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openPaymentApp(String app, InvoiceModel invoice) async {
    Navigator.pop(context);

    // For now, UPI deep links would require a UPI ID. Since we don't have payment gateway setup,
    // we'll just show a message and allow them to upload receipt
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Complete payment in $app and upload receipt'),
        action: SnackBarAction(
          label: 'Upload',
          onPressed: () => _uploadReceipt(invoice),
        ),
        duration: const Duration(seconds: 5),
      ),
    );
  }

  Future<void> _uploadReceipt(InvoiceModel invoice) async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 70,
      );

      if (image == null) return;

      setState(() => _uploadingReceipt = true);

      final response = await _apiClient.submitInvoicePaymentProof(
        invoiceId: invoice.id,
        proofPath: image.path,
        paymentMethod: 'UPI',
        paymentDate: DateTime.now().toIso8601String(),
      );

      if (response.statusCode == 201) {
        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment proof uploaded successfully! ✓'),
            backgroundColor: Colors.green,
          ),
        );

        // Refresh data
        context.read<ParentBloc>().add(RefreshStudentData(widget.studentId));
      }
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to upload receipt: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _uploadingReceipt = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final student = widget.student;
    if (student == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Student Details'),
        ),
        body: const Center(
          child: Text('Student data not available'),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: BlocBuilder<ParentBloc, ParentState>(
        builder: (context, state) {
          return CustomScrollView(
            slivers: [
              // Header
              SliverAppBar(
                expandedHeight: 200,
                pinned: true,
                backgroundColor: AppColors.primary,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => context.pop(),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          AppColors.primary,
                          AppColors.primary.withValues(alpha: 0.8),
                        ],
                      ),
                    ),
                    child: SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 60, 16, 16),
                        child: Row(
                          children: [
                            // Avatar
                            Hero(
                              tag: 'student_photo_${student.id}',
                              child: Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.2),
                                      blurRadius: 8,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: student.photoUrl != null
                                    ? ClipOval(
                                        child: CachedNetworkImage(
                                          imageUrl: student.photoUrl!,
                                          fit: BoxFit.cover,
                                          placeholder: (context, url) => Center(
                                            child: CircularProgressIndicator(
                                              color: AppColors.primary,
                                              strokeWidth: 2,
                                            ),
                                          ),
                                          errorWidget: (context, url, error) => Center(
                                            child: Text(
                                              student.name.isNotEmpty
                                                  ? student.name[0].toUpperCase()
                                                  : '?',
                                              style: AppTextStyles.h1.copyWith(
                                                color: AppColors.primary,
                                              ),
                                            ),
                                          ),
                                        ),
                                      )
                                    : Center(
                                        child: Text(
                                          student.name.isNotEmpty
                                              ? student.name[0].toUpperCase()
                                              : '?',
                                          style: AppTextStyles.h1.copyWith(
                                            color: AppColors.primary,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            // Info
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    student.name,
                                    style: AppTextStyles.h3.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  if (student.grade != null && student.grade!.isNotEmpty)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        'Grade ${student.grade}',
                                        style: AppTextStyles.labelSmall.copyWith(
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: student.status == 'active'
                                              ? Colors.green.withValues(alpha: 0.3)
                                              : Colors.grey.withValues(alpha: 0.3),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          student.status == 'active' ? 'Active' : student.status ?? '',
                                          style: AppTextStyles.labelSmall.copyWith(
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                      if (student.dateOfJoining != null) ...[
                                        const SizedBox(width: 8),
                                        Text(
                                          _calculateYearsStudying(student.dateOfJoining),
                                          style: AppTextStyles.bodySmall.copyWith(
                                            color: Colors.white.withValues(alpha: 0.9),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // Tabs
              SliverPersistentHeader(
                pinned: true,
                delegate: _SliverAppBarDelegate(
                  TabBar(
                    controller: _tabController,
                    labelColor: AppColors.primary,
                    unselectedLabelColor: Colors.grey,
                    indicatorColor: AppColors.primary,
                    labelStyle: AppTextStyles.labelLarge,
                    tabs: const [
                      Tab(text: 'Profile'),
                      Tab(text: 'Classes'),
                      Tab(text: 'Fees'),
                      Tab(text: 'Updates'),
                    ],
                  ),
                ),
              ),

              // Tab Content
              SliverFillRemaining(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildProfileTab(student),
                    _buildClassesTab(state),
                    _buildFeesTab(state),
                    _buildUpdatesTab(state),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildProfileTab(UserModel student) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildInfoCard(
          'Personal Information',
          [
            if (student.dob != null)
              _buildInfoRow(Icons.cake, 'Date of Birth', _formatDate(student.dob)),
            if (student.dateOfJoining != null)
              _buildInfoRow(Icons.event, 'Joined On', _formatDate(student.dateOfJoining)),
            if (student.contactNumber != null)
              _buildInfoRow(Icons.phone, 'Contact', student.contactNumber!),
            if (student.email.isNotEmpty)
              _buildInfoRow(Icons.email, 'Email', student.email),
          ],
        ),
        const SizedBox(height: 16),
        if (student.courses.isNotEmpty)
          _buildInfoCard(
            'Enrolled Courses',
            student.courses.map((course) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.music_note,
                        color: AppColors.primary,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        course,
                        style: AppTextStyles.bodyMedium.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildClassesTab(ParentState state) {
    if (state is ParentLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is ParentStudentDataLoaded) {
      final enrollments = state.enrollments;
      if (enrollments.isEmpty) {
        return _buildEmptyState('No classes found');
      }

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: enrollments.length,
        itemBuilder: (context, index) {
          final batch = enrollments[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.class_, color: AppColors.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          batch.batchName,
                          style: AppTextStyles.bodyLarge.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (batch.teacherId != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.person, color: Colors.grey.shade600, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Teacher ID: ${batch.teacherId}',
                          style: AppTextStyles.bodyMedium,
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      );
    }

    return _buildEmptyState('Unable to load classes');
  }

  Widget _buildFeesTab(ParentState state) {
    if (state is ParentLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is ParentStudentDataLoaded) {
      final invoices = state.invoices;
      if (invoices.isEmpty) {
        return _buildEmptyState('No fee records found');
      }

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: invoices.length,
        itemBuilder: (context, index) {
          final invoice = invoices[index];
          final isPending = invoice.status == 'pending';
          final isOverdue = invoice.status == 'overdue';
          final isPaid = invoice.status == 'paid';
          final showPayButton = _isPaymentDue(invoice);

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        isPaid
                            ? Icons.check_circle
                            : isPending || isOverdue
                                ? Icons.payment
                                : Icons.pending,
                        color: isPaid
                            ? Colors.green
                            : isPending
                                ? Colors.orange
                                : isOverdue
                                    ? Colors.red
                                    : Colors.grey,
                        size: 32,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '₹${invoice.amount ?? 0}',
                              style: AppTextStyles.bodyLarge.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            if (invoice.courseName != null)
                              Text(
                                invoice.courseName!,
                                style: AppTextStyles.bodySmall,
                              ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isPaid
                                        ? Colors.green.withValues(alpha: 0.1)
                                        : isPending
                                            ? Colors.orange.withValues(alpha: 0.1)
                                            : Colors.red.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    invoice.status?.toUpperCase() ?? 'UNKNOWN',
                                    style: AppTextStyles.labelSmall.copyWith(
                                      color: isPaid
                                          ? Colors.green
                                          : isPending
                                              ? Colors.orange
                                              : Colors.red,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                if (invoice.dueDate != null) ...[
                                  const SizedBox(width: 8),
                                  Text(
                                    'Due: ${_formatDate(invoice.dueDate)}',
                                    style: AppTextStyles.labelSmall,
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (showPayButton) ...[
                    const SizedBox(height: 12),
                    const Divider(height: 1),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(
                          Icons.calendar_today,
                          size: 16,
                          color: AppColors.error,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Payment due! Pay between 1st-5th',
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.error,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        ElevatedButton.icon(
                          onPressed: _uploadingReceipt
                              ? null
                              : () => _showPaymentOptions(invoice),
                          icon: const Icon(Icons.payment, size: 18),
                          label: const Text('Pay Now'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.secondary,
                            foregroundColor: Colors.black,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      );
    }

    return _buildEmptyState('Unable to load fees');
  }

  Widget _buildUpdatesTab(ParentState state) {
    if (state is ParentLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is ParentStudentDataLoaded) {
      final notifications = state.notifications;
      final events = state.events;
      final notices = state.notices;

      final allUpdates = <Widget>[];

      // Add notifications
      for (var notif in notifications.take(5)) {
        allUpdates.add(_buildUpdateCard(
          Icons.notifications,
          Colors.blue,
          notif.title,
          notif.message ?? '',
          notif.createdAt,
        ));
      }

      // Add events
      for (var event in events.take(5)) {
        allUpdates.add(_buildUpdateCard(
          Icons.event,
          Colors.purple,
          event.title,
          event.description ?? '',
          event.eventDate,
        ));
      }

      // Add notices
      for (var notice in notices.take(5)) {
        allUpdates.add(_buildUpdateCard(
          Icons.info,
          Colors.orange,
          notice.title,
          notice.content ?? '',
          notice.createdAt,
        ));
      }

      if (allUpdates.isEmpty) {
        return _buildEmptyState('No updates available');
      }

      return ListView(
        padding: const EdgeInsets.all(16),
        children: allUpdates,
      );
    }

    return _buildEmptyState('Unable to load updates');
  }

  Widget _buildInfoCard(String title, List<Widget> children) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: AppTextStyles.bodyLarge.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade600),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: AppTextStyles.labelSmall.copyWith(
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: AppTextStyles.bodyMedium,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpdateCard(IconData icon, Color color, String title, String subtitle, String? date) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.1),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(
          title,
          style: AppTextStyles.bodyMedium.copyWith(
            fontWeight: FontWeight.w500,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: subtitle.isNotEmpty
            ? Text(
                subtitle,
                style: AppTextStyles.bodySmall,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              )
            : null,
        trailing: date != null
            ? Text(
                _formatDate(date),
                style: AppTextStyles.labelSmall,
              )
            : null,
      ),
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 60,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: AppTextStyles.bodyMedium.copyWith(
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  _SliverAppBarDelegate(this._tabBar);

  final TabBar _tabBar;

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.white,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}
