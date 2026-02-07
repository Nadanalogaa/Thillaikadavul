import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../data/models/invoice_model.dart';
import '../../widgets/empty_state_widget.dart';

class StudentFeesScreen extends StatefulWidget {
  final List<InvoiceModel> invoices;
  final bool isLoading;
  final VoidCallback onRefresh;

  const StudentFeesScreen({
    super.key,
    required this.invoices,
    required this.isLoading,
    required this.onRefresh,
  });

  @override
  State<StudentFeesScreen> createState() => _StudentFeesScreenState();
}

class _StudentFeesScreenState extends State<StudentFeesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<InvoiceModel> get _pendingInvoices =>
      widget.invoices.where((i) => i.status == 'pending').toList();

  List<InvoiceModel> get _overdueInvoices =>
      widget.invoices.where((i) => i.status == 'overdue').toList();

  List<InvoiceModel> get _paidInvoices =>
      widget.invoices.where((i) => i.status == 'paid').toList();

  double get _totalPending => [..._pendingInvoices, ..._overdueInvoices]
      .fold(0.0, (sum, i) => sum + (i.amount ?? 0));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Fees'),
        backgroundColor: AppColors.studentAccent,
        automaticallyImplyLeading: false,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: [
            Tab(
              text: 'Pending (${_pendingInvoices.length})',
            ),
            Tab(
              text: 'Overdue (${_overdueInvoices.length})',
            ),
            Tab(
              text: 'Paid (${_paidInvoices.length})',
            ),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async => widget.onRefresh(),
        child: widget.isLoading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  // Summary Card
                  if (_totalPending > 0) _FeeSummaryCard(totalPending: _totalPending),

                  // Tab Views
                  Expanded(
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        _InvoiceList(
                          invoices: _pendingInvoices,
                          emptyTitle: 'No Pending Fees',
                          emptySubtitle: 'You have no pending fee payments.',
                          emptyIcon: Icons.check_circle_outline,
                        ),
                        _InvoiceList(
                          invoices: _overdueInvoices,
                          emptyTitle: 'No Overdue Fees',
                          emptySubtitle: 'Great! You have no overdue payments.',
                          emptyIcon: Icons.thumb_up_outlined,
                        ),
                        _InvoiceList(
                          invoices: _paidInvoices,
                          emptyTitle: 'No Payment History',
                          emptySubtitle: 'Your paid invoices will appear here.',
                          emptyIcon: Icons.receipt_long_outlined,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _FeeSummaryCard extends StatelessWidget {
  final double totalPending;

  const _FeeSummaryCard({required this.totalPending});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.warning.withValues(alpha: 0.15),
            AppColors.warning.withValues(alpha: 0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.account_balance_wallet,
              color: AppColors.warning,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Total Due',
                  style: AppTextStyles.labelLarge.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '₹${totalPending.toStringAsFixed(0)}',
                  style: AppTextStyles.h2.copyWith(
                    color: AppColors.warning,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.info_outline,
              color: AppColors.warning,
              size: 20,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.1, end: 0);
  }
}

class _InvoiceList extends StatelessWidget {
  final List<InvoiceModel> invoices;
  final String emptyTitle;
  final String emptySubtitle;
  final IconData emptyIcon;

  const _InvoiceList({
    required this.invoices,
    required this.emptyTitle,
    required this.emptySubtitle,
    required this.emptyIcon,
  });

  @override
  Widget build(BuildContext context) {
    if (invoices.isEmpty) {
      return EmptyStateWidget(
        icon: emptyIcon,
        title: emptyTitle,
        subtitle: emptySubtitle,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: invoices.length,
      itemBuilder: (context, index) {
        final invoice = invoices[index];
        return _InvoiceCard(
          invoice: invoice,
          index: index,
        );
      },
    );
  }
}

class _InvoiceCard extends StatelessWidget {
  final InvoiceModel invoice;
  final int index;

  const _InvoiceCard({
    required this.invoice,
    required this.index,
  });

  Color get _statusColor {
    switch (invoice.status) {
      case 'paid':
        return AppColors.success;
      case 'overdue':
        return AppColors.error;
      case 'pending':
      default:
        return AppColors.warning;
    }
  }

  IconData get _statusIcon {
    switch (invoice.status) {
      case 'paid':
        return Icons.check_circle;
      case 'overdue':
        return Icons.warning_amber;
      case 'pending':
      default:
        return Icons.schedule;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: _statusColor.withValues(alpha: 0.2)),
      ),
      child: InkWell(
        onTap: () => _showInvoiceDetails(context),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          _statusColor.withValues(alpha: 0.2),
                          _statusColor.withValues(alpha: 0.1),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _statusIcon,
                      color: _statusColor,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          invoice.courseName ?? 'Fee Invoice',
                          style: AppTextStyles.labelLarge.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (invoice.billingPeriod != null)
                          Text(
                            invoice.billingPeriod!,
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
                        '₹${(invoice.amount ?? 0).toStringAsFixed(0)}',
                        style: AppTextStyles.h3.copyWith(
                          color: _statusColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: _statusColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          invoice.status.toUpperCase(),
                          style: AppTextStyles.caption.copyWith(
                            color: _statusColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Info row
              Row(
                children: [
                  if (invoice.issueDate != null) ...[
                    _InfoChip(
                      icon: Icons.calendar_today,
                      label: 'Issued: ${_formatDate(invoice.issueDate!)}',
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (invoice.dueDate != null)
                    _InfoChip(
                      icon: Icons.event,
                      label: 'Due: ${_formatDate(invoice.dueDate!)}',
                      color: invoice.status == 'overdue'
                          ? AppColors.error
                          : null,
                    ),
                ],
              ),

              // Payment info (for paid invoices)
              if (invoice.status == 'paid' &&
                  invoice.paymentMethod != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.check_circle,
                        size: 16,
                        color: AppColors.success,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Paid via ${invoice.paymentMethod}',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.success,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (invoice.paymentDate != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          '• ${_formatDate(invoice.paymentDate!)}',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    )
        .animate(delay: Duration(milliseconds: 100 * index))
        .fadeIn(duration: 400.ms)
        .slideX(begin: 0.1, end: 0, duration: 400.ms, curve: Curves.easeOut);
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }

  void _showInvoiceDetails(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _InvoiceDetailsSheet(invoice: invoice),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;

  const _InfoChip({
    required this.icon,
    required this.label,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final chipColor = color ?? AppColors.info;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: chipColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: chipColor),
          const SizedBox(width: 6),
          Text(
            label,
            style: AppTextStyles.caption.copyWith(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _InvoiceDetailsSheet extends StatelessWidget {
  final InvoiceModel invoice;

  const _InvoiceDetailsSheet({required this.invoice});

  Color get _statusColor {
    switch (invoice.status) {
      case 'paid':
        return AppColors.success;
      case 'overdue':
        return AppColors.error;
      case 'pending':
      default:
        return AppColors.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: ListView(
            controller: scrollController,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Invoice Header
              Center(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _statusColor.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    invoice.status == 'paid'
                        ? Icons.check_circle
                        : Icons.receipt_long,
                    color: _statusColor,
                    size: 48,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Amount
              Text(
                '₹${(invoice.amount ?? 0).toStringAsFixed(0)}',
                style: AppTextStyles.h1.copyWith(
                  color: _statusColor,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),

              // Status badge
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: _statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    invoice.status.toUpperCase(),
                    style: AppTextStyles.labelLarge.copyWith(
                      color: _statusColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Details
              _DetailRow(
                icon: Icons.menu_book,
                title: 'Course',
                value: invoice.courseName ?? 'N/A',
              ),
              _DetailRow(
                icon: Icons.date_range,
                title: 'Billing Period',
                value: invoice.billingPeriod ?? 'N/A',
              ),
              _DetailRow(
                icon: Icons.calendar_today,
                title: 'Issue Date',
                value: invoice.issueDate != null
                    ? _formatDateLong(invoice.issueDate!)
                    : 'N/A',
              ),
              _DetailRow(
                icon: Icons.event,
                title: 'Due Date',
                value: invoice.dueDate != null
                    ? _formatDateLong(invoice.dueDate!)
                    : 'N/A',
              ),

              // Payment details (if paid)
              if (invoice.status == 'paid') ...[
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),
                Text('Payment Details', style: AppTextStyles.h4),
                const SizedBox(height: 12),
                _DetailRow(
                  icon: Icons.payment,
                  title: 'Payment Method',
                  value: invoice.paymentMethod ?? 'N/A',
                ),
                if (invoice.transactionId != null)
                  _DetailRow(
                    icon: Icons.confirmation_number,
                    title: 'Transaction ID',
                    value: invoice.transactionId!,
                  ),
                if (invoice.paymentDate != null)
                  _DetailRow(
                    icon: Icons.check_circle,
                    title: 'Payment Date',
                    value: _formatDateLong(invoice.paymentDate!),
                  ),
              ],

              // Fee reminder for pending
              if (invoice.status == 'pending' ||
                  invoice.status == 'overdue') ...[
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.info.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.info_outline,
                        color: AppColors.info,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Pay via UPI and upload the payment proof for admin verification. Fees are due on the 1st of every month.',
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => context.push(
                      '/student/fees/${invoice.id}/upi'),
                  child: const Text('Pay via UPI'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () => context.push(
                      '/student/fees/${invoice.id}/proof'),
                  child: const Text('Upload Payment Proof'),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  String _formatDateLong(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return '${date.day} ${months[date.month - 1]} ${date.year}';
    } catch (_) {
      return dateStr;
    }
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;

  const _DetailRow({
    required this.icon,
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                Text(
                  value,
                  style: AppTextStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
