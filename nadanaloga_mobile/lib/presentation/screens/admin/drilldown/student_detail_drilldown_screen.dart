import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../data/models/user_model.dart';
import '../../../../data/models/invoice_model.dart';
import '../../../bloc/user_management/user_management_bloc.dart';
import '../../../bloc/user_management/user_management_event.dart';
import '../../../bloc/user_management/user_management_state.dart';
import '../../../bloc/fee/fee_bloc.dart';
import '../../../bloc/fee/fee_event.dart';
import '../../../bloc/fee/fee_state.dart';

class StudentDetailDrilldownScreen extends StatefulWidget {
  final int studentId;
  final bool showFeesOnly;

  const StudentDetailDrilldownScreen({
    super.key,
    required this.studentId,
    this.showFeesOnly = false,
  });

  @override
  State<StudentDetailDrilldownScreen> createState() => _StudentDetailDrilldownScreenState();
}

class _StudentDetailDrilldownScreenState extends State<StudentDetailDrilldownScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.showFeesOnly ? 1 : 0,
    );
    context.read<UserManagementBloc>().add(LoadUsers());
    context.read<FeeBloc>().add(LoadInvoices());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<UserManagementBloc, UserManagementState>(
      builder: (context, state) {
        UserModel? student;
        if (state is UserManagementLoaded) {
          student = state.users.where((u) => u.id == widget.studentId).firstOrNull;
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(student?.name ?? 'Student Details'),
            centerTitle: true,
            bottom: TabBar(
              controller: _tabController,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white70,
              indicatorColor: Colors.white,
              indicatorWeight: 3,
              tabs: const [
                Tab(icon: Icon(Icons.person_outline), text: 'Profile'),
                Tab(icon: Icon(Icons.payments_outlined), text: 'Fees'),
              ],
            ),
            actions: [
              if (student != null)
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => context.push('/admin/users/${student!.id}/edit'),
                ),
            ],
          ),
          body: state is UserManagementLoading
              ? const Center(child: CircularProgressIndicator())
              : student == null
                  ? const Center(child: Text('Student not found'))
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        _ProfileTab(student: student),
                        _FeesTab(studentId: widget.studentId),
                      ],
                    ),
        );
      },
    );
  }
}

class _ProfileTab extends StatelessWidget {
  final UserModel student;

  const _ProfileTab({required this.student});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Profile Header
          _ProfileHeader(student: student)
              .animate()
              .fadeIn(duration: 400.ms)
              .scale(begin: const Offset(0.95, 0.95), end: const Offset(1, 1)),
          const SizedBox(height: 20),

          // Info Sections
          _InfoSection(
            title: 'Personal Information',
            icon: Icons.person_outline,
            items: [
              _InfoRow('Student ID', student.userId ?? '-'),
              _InfoRow('Full Name', student.name),
              _InfoRow("Father's Name", student.fatherName ?? '-'),
              _InfoRow('Date of Birth', _formatDate(student.dob)),
              _InfoRow('Gender', student.sex ?? '-'),
            ],
          ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1, end: 0),

          const SizedBox(height: 16),

          _InfoSection(
            title: 'Contact Information',
            icon: Icons.contact_phone_outlined,
            items: [
              _InfoRow('Email', student.email),
              _InfoRow('Phone', student.contactNumber ?? '-'),
              _InfoRow('Address', student.address ?? '-'),
            ],
          ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1, end: 0),

          const SizedBox(height: 16),

          _InfoSection(
            title: 'Academic Information',
            icon: Icons.school_outlined,
            items: [
              _InfoRow('Date of Joining', _formatDate(student.dateOfJoining)),
              _InfoRow('Class Preference', student.classPreference ?? '-'),
              _InfoRow('School', student.schoolName ?? '-'),
              _InfoRow('Standard', student.standard ?? '-'),
              _InfoRow('Status', student.status?.toUpperCase() ?? 'ACTIVE'),
            ],
          ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.1, end: 0),

          const SizedBox(height: 16),

          // Courses Enrolled
          _CoursesSection(courses: student.courses)
              .animate(delay: 400.ms)
              .fadeIn()
              .slideY(begin: 0.1, end: 0),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '-';
    try {
      final date = DateTime.parse(dateStr);
      final months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return '${date.day} ${months[date.month - 1]} ${date.year}';
    } catch (_) {
      return dateStr;
    }
  }
}

class _ProfileHeader extends StatelessWidget {
  final UserModel student;

  const _ProfileHeader({required this.student});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.studentAccent,
            AppColors.studentAccent.withOpacity(0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.studentAccent.withOpacity(0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          CircleAvatar(
            radius: 50,
            backgroundColor: Colors.white,
            backgroundImage: student.photoUrl != null && student.photoUrl!.isNotEmpty
                ? NetworkImage(student.photoUrl!)
                : null,
            child: student.photoUrl == null || student.photoUrl!.isEmpty
                ? Text(
                    student.name.isNotEmpty ? student.name[0].toUpperCase() : '?',
                    style: AppTextStyles.h1.copyWith(
                      color: AppColors.studentAccent,
                      fontSize: 40,
                    ),
                  )
                : null,
          ),
          const SizedBox(height: 16),
          Text(
            student.name,
            style: AppTextStyles.h2.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          if (student.userId != null) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                student.userId!,
                style: AppTextStyles.bodySmall.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<_InfoRow> items;

  const _InfoSection({
    required this.title,
    required this.icon,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: AppColors.divider.withOpacity(0.5)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: AppTextStyles.labelLarge.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...items.map((item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 120,
                        child: Text(
                          item.label,
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          item.value,
                          style: AppTextStyles.bodyMedium.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }
}

class _InfoRow {
  final String label;
  final String value;

  const _InfoRow(this.label, this.value);
}

class _CoursesSection extends StatelessWidget {
  final List<String> courses;

  const _CoursesSection({required this.courses});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: AppColors.divider.withOpacity(0.5)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.menu_book, color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Enrolled Courses',
                  style: AppTextStyles.labelLarge.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (courses.isEmpty)
              Text(
                'No courses enrolled',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textSecondary,
                ),
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: courses.map((course) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(_getCourseIcon(course), size: 16, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Text(
                          course,
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }

  IconData _getCourseIcon(String courseName) {
    switch (courseName.toLowerCase()) {
      case 'bharatanatyam':
        return Icons.self_improvement;
      case 'vocal':
      case 'carnatic vocal':
        return Icons.mic;
      case 'drawing':
        return Icons.brush;
      case 'abacus':
        return Icons.calculate;
      default:
        return Icons.school;
    }
  }
}

class _FeesTab extends StatelessWidget {
  final int studentId;

  const _FeesTab({required this.studentId});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<FeeBloc, FeeState>(
      builder: (context, state) {
        if (state is FeeLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        List<InvoiceModel> invoices = [];
        if (state is InvoicesLoaded) {
          invoices = state.invoices.where((i) => i.studentId == studentId).toList();
        }

        if (invoices.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.receipt_long_outlined, size: 64, color: AppColors.textSecondary.withOpacity(0.5))
                    .animate(onPlay: (c) => c.repeat())
                    .shimmer(duration: 2000.ms, color: AppColors.primary.withOpacity(0.3)),
                const SizedBox(height: 16),
                Text(
                  'No Fee Records',
                  style: AppTextStyles.h3.copyWith(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 8),
                Text(
                  'No invoices found for this student',
                  style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textHint),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => context.push('/admin/fees/invoices/add'),
                  icon: const Icon(Icons.add),
                  label: const Text('Create Invoice'),
                ),
              ],
            ),
          );
        }

        // Calculate totals
        final totalAmount = invoices.fold<double>(0, (sum, i) => sum + (i.amount ?? 0));
        final paidAmount = invoices
            .where((i) => i.isPaid)
            .fold<double>(0, (sum, i) => sum + (i.amount ?? 0));
        final pendingAmount = totalAmount - paidAmount;

        return RefreshIndicator(
          onRefresh: () async {
            context.read<FeeBloc>().add(LoadInvoices());
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Summary Cards
              Row(
                children: [
                  Expanded(
                    child: _FeeSummaryCard(
                      title: 'Total',
                      amount: totalAmount,
                      color: AppColors.primary,
                      icon: Icons.account_balance_wallet,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _FeeSummaryCard(
                      title: 'Paid',
                      amount: paidAmount,
                      color: AppColors.success,
                      icon: Icons.check_circle,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _FeeSummaryCard(
                      title: 'Pending',
                      amount: pendingAmount,
                      color: AppColors.warning,
                      icon: Icons.pending,
                    ),
                  ),
                ],
              ).animate().fadeIn(duration: 400.ms),

              const SizedBox(height: 24),

              Text(
                'Invoice History',
                style: AppTextStyles.h3,
              ).animate(delay: 100.ms).fadeIn(),
              const SizedBox(height: 12),

              ...invoices.asMap().entries.map((entry) {
                final index = entry.key;
                final invoice = entry.value;
                return _InvoiceCard(invoice: invoice)
                    .animate(delay: Duration(milliseconds: 100 * (index + 1)))
                    .fadeIn(duration: 300.ms)
                    .slideX(begin: 0.05, end: 0);
              }),
            ],
          ),
        );
      },
    );
  }
}

class _FeeSummaryCard extends StatelessWidget {
  final String title;
  final double amount;
  final Color color;
  final IconData icon;

  const _FeeSummaryCard({
    required this.title,
    required this.amount,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            '₹${amount.toStringAsFixed(0)}',
            style: AppTextStyles.labelLarge.copyWith(
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            title,
            style: AppTextStyles.caption.copyWith(
              color: color.withOpacity(0.8),
            ),
          ),
        ],
      ),
    );
  }
}

class _InvoiceCard extends StatelessWidget {
  final InvoiceModel invoice;

  const _InvoiceCard({required this.invoice});

  @override
  Widget build(BuildContext context) {
    final statusColor = invoice.isPaid
        ? AppColors.success
        : invoice.isOverdue
            ? AppColors.error
            : AppColors.warning;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: statusColor.withOpacity(0.3)),
      ),
      child: InkWell(
        onTap: () {
          if (invoice.isPending) {
            context.push('/admin/fees/invoices/${invoice.id}/pay');
          }
        },
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      invoice.isPaid
                          ? Icons.check_circle
                          : invoice.isOverdue
                              ? Icons.error
                              : Icons.pending,
                      color: statusColor,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          invoice.courseName ?? 'Invoice #${invoice.id}',
                          style: AppTextStyles.labelLarge.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          invoice.billingPeriod ?? 'N/A',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '₹${invoice.amount?.toStringAsFixed(0) ?? '0'}',
                        style: AppTextStyles.h3.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          invoice.status.toUpperCase(),
                          style: AppTextStyles.caption.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              if (invoice.isPending) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.calendar_today, size: 14, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      'Due: ${invoice.dueDate ?? 'N/A'}',
                      style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                    ),
                    const Spacer(),
                    ElevatedButton.icon(
                      onPressed: () => _showQuickPaymentSheet(context, invoice),
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text('Mark Paid'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        textStyle: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600),
                        elevation: 0,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                    ),
                  ],
                ),
              ],
              if (invoice.isPaid && invoice.paymentDate != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.check, size: 14, color: AppColors.success),
                    const SizedBox(width: 4),
                    Text(
                      'Paid on ${invoice.paymentDate}',
                      style: AppTextStyles.caption.copyWith(color: AppColors.success),
                    ),
                    if (invoice.paymentMethod != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        '• ${invoice.paymentMethod}',
                        style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showQuickPaymentSheet(BuildContext context, InvoiceModel invoice) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BlocProvider.value(
        value: context.read<FeeBloc>(),
        child: _QuickPaymentSheet(
          invoice: invoice,
          onPaymentRecorded: () {
            context.read<FeeBloc>().add(LoadInvoices());
          },
        ),
      ),
    );
  }
}

class _QuickPaymentSheet extends StatefulWidget {
  final InvoiceModel invoice;
  final VoidCallback onPaymentRecorded;

  const _QuickPaymentSheet({
    required this.invoice,
    required this.onPaymentRecorded,
  });

  @override
  State<_QuickPaymentSheet> createState() => _QuickPaymentSheetState();
}

class _QuickPaymentSheetState extends State<_QuickPaymentSheet> {
  String _paymentMethod = 'Cash';
  final _transactionIdController = TextEditingController();
  DateTime _paymentDate = DateTime.now();
  bool _isLoading = false;

  @override
  void dispose() {
    _transactionIdController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _paymentDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _paymentDate = picked);
    }
  }

  void _submit() {
    setState(() => _isLoading = true);

    final paymentData = <String, dynamic>{
      'payment_method': _paymentMethod,
      'payment_date': _paymentDate.toIso8601String(),
      if (_transactionIdController.text.trim().isNotEmpty)
        'transaction_id': _transactionIdController.text.trim(),
    };

    context.read<FeeBloc>().add(RecordPayment(
          invoiceId: widget.invoice.id,
          paymentData: paymentData,
        ));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<FeeBloc, FeeState>(
      listener: (context, state) {
        if (state is FeeOperationSuccess) {
          widget.onPaymentRecorded();
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Payment recorded successfully'),
              backgroundColor: AppColors.success,
            ),
          );
        } else if (state is FeeError) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.divider,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Title
            Text('Mark as Paid', style: AppTextStyles.h3),
            const SizedBox(height: 16),

            // Invoice Summary
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.invoice.courseName ?? 'Invoice',
                          style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          widget.invoice.billingPeriod ?? '',
                          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '₹${widget.invoice.amount?.toStringAsFixed(0) ?? '0'}',
                    style: AppTextStyles.h3.copyWith(color: AppColors.success, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Payment Method
            Text('Payment Method', style: AppTextStyles.labelLarge),
            const SizedBox(height: 8),
            Row(
              children: [
                _PaymentMethodButton(
                  icon: Icons.money,
                  label: 'Cash',
                  isSelected: _paymentMethod == 'Cash',
                  onTap: () => setState(() => _paymentMethod = 'Cash'),
                ),
                const SizedBox(width: 8),
                _PaymentMethodButton(
                  icon: Icons.phone_android,
                  label: 'UPI',
                  isSelected: _paymentMethod == 'UPI',
                  onTap: () => setState(() => _paymentMethod = 'UPI'),
                ),
                const SizedBox(width: 8),
                _PaymentMethodButton(
                  icon: Icons.account_balance,
                  label: 'Bank',
                  isSelected: _paymentMethod == 'Bank',
                  onTap: () => setState(() => _paymentMethod = 'Bank'),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Transaction ID (for UPI and Bank)
            if (_paymentMethod != 'Cash') ...[
              TextField(
                controller: _transactionIdController,
                decoration: InputDecoration(
                  labelText: _paymentMethod == 'UPI' ? 'UPI Transaction ID' : 'Bank Reference',
                  hintText: 'Optional',
                  prefixIcon: const Icon(Icons.tag, size: 20),
                  isDense: true,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Payment Date
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.divider),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Icon(Icons.calendar_today, size: 20, color: AppColors.textSecondary),
                    const SizedBox(width: 12),
                    Text(
                      '${_paymentDate.day}/${_paymentDate.month}/${_paymentDate.year}',
                      style: AppTextStyles.bodyMedium,
                    ),
                    const Spacer(),
                    Text('Change', style: AppTextStyles.caption.copyWith(color: AppColors.primary)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Submit Button
            ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Confirm Payment', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentMethodButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentMethodButton({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.success.withOpacity(0.1) : AppColors.background,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.success : AppColors.divider,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? AppColors.success : AppColors.textSecondary),
              const SizedBox(height: 4),
              Text(
                label,
                style: AppTextStyles.caption.copyWith(
                  color: isSelected ? AppColors.success : AppColors.textSecondary,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
