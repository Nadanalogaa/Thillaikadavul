import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:image_picker/image_picker.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../data/models/invoice_model.dart';
import '../../../core/network/api_client.dart';
import '../../../di/injection_container.dart';
import '../../widgets/empty_state_widget.dart';

class StudentFeesScreen extends StatefulWidget {
  final List<InvoiceModel> invoices;
  final bool isLoading;
  final VoidCallback onRefresh;
  final int? initialInvoiceToPay;

  const StudentFeesScreen({
    super.key,
    required this.invoices,
    required this.isLoading,
    required this.onRefresh,
    this.initialInvoiceToPay,
  });

  @override
  State<StudentFeesScreen> createState() => _StudentFeesScreenState();
}

class _StudentFeesScreenState extends State<StudentFeesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _imagePicker = ImagePicker();
  final _apiClient = sl<ApiClient>();
  bool _uploadingReceipt = false;
  bool _handledInitialPayment = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _openInitialPaymentIfNeeded();
    });
  }

  @override
  void didUpdateWidget(covariant StudentFeesScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialInvoiceToPay != widget.initialInvoiceToPay) {
      _handledInitialPayment = false;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _openInitialPaymentIfNeeded();
      });
    }
  }

  void _openInitialPaymentIfNeeded() {
    if (_handledInitialPayment) return;
    final targetId = widget.initialInvoiceToPay;
    if (targetId == null) return;
    final match = widget.invoices.where((i) => i.id == targetId).toList();
    if (match.isEmpty) return;
    _handledInitialPayment = true;
    _tabController.animateTo(0);
    _showPaymentOptions(match.first);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  bool _isPaymentDue(InvoiceModel invoice) {
    if (invoice.status != 'pending') return false;
    final now = DateTime.now();
    return now.day >= 1 && now.day <= 7;
  }

  bool _isUnderProcessing(InvoiceModel invoice) {
    return invoice.status != 'paid' &&
        invoice.paymentDetails != null &&
        invoice.paymentDetails!.isNotEmpty;
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
            if (invoice.hasDiscount) ...[
              Text(
                'Original: ₹${(invoice.originalAmount ?? 0).toStringAsFixed(0)}',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textSecondary,
                  decoration: TextDecoration.lineThrough,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${invoice.discountText} applied!',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.success,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
            Text(
              'Amount: ₹${(invoice.amount ?? 0).toStringAsFixed(0)}',
              style: AppTextStyles.bodyLarge.copyWith(
                color: invoice.hasDiscount ? AppColors.success : AppColors.textSecondary,
                fontWeight: invoice.hasDiscount ? FontWeight.w600 : FontWeight.normal,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            _buildPaymentButton(
              'Google Pay',
              Icons.account_balance_wallet,
              const Color(0xFF4285F4),
              () => _openPaymentApp('Google Pay', invoice),
            ),
            const SizedBox(height: 12),
            _buildPaymentButton(
              'PhonePe',
              Icons.phone_android,
              const Color(0xFF5F259F),
              () => _openPaymentApp('PhonePe', invoice),
            ),
            const SizedBox(height: 12),
            _buildPaymentButton(
              'CRED',
              Icons.credit_card,
              const Color(0xFF000000),
              () => _openPaymentApp('CRED', invoice),
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
        widget.onRefresh();
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
                          showPayAction: true,
                          onPayNow: (invoice) => _showPaymentOptions(invoice),
                          isPayEnabled: (invoice) =>
                              _isPaymentDue(invoice) && !_isUnderProcessing(invoice),
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
  final bool showPayAction;
  final void Function(InvoiceModel invoice)? onPayNow;
  final bool Function(InvoiceModel invoice)? isPayEnabled;

  const _InvoiceList({
    required this.invoices,
    required this.emptyTitle,
    required this.emptySubtitle,
    required this.emptyIcon,
    this.showPayAction = false,
    this.onPayNow,
    this.isPayEnabled,
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
          showPayAction: showPayAction,
          onPayNow: onPayNow,
          isPayEnabled: isPayEnabled,
        );
      },
    );
  }
}

class _InvoiceCard extends StatelessWidget {
  final InvoiceModel invoice;
  final int index;
  final bool showPayAction;
  final void Function(InvoiceModel invoice)? onPayNow;
  final bool Function(InvoiceModel invoice)? isPayEnabled;

  const _InvoiceCard({
    required this.invoice,
    required this.index,
    required this.showPayAction,
    required this.onPayNow,
    required this.isPayEnabled,
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
                      if (invoice.hasDiscount) ...[
                        Text(
                          '₹${(invoice.originalAmount ?? 0).toStringAsFixed(0)}',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                        const SizedBox(height: 2),
                      ],
                      Text(
                        '₹${(invoice.amount ?? 0).toStringAsFixed(0)}',
                        style: AppTextStyles.h3.copyWith(
                          color: _statusColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (invoice.hasDiscount)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          margin: const EdgeInsets.only(top: 4),
                          decoration: BoxDecoration(
                            color: AppColors.success.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            invoice.discountText,
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.success,
                              fontWeight: FontWeight.w600,
                              fontSize: 9,
                            ),
                          ),
                        ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        margin: const EdgeInsets.only(top: 4),
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
              if (invoice.status != 'paid' &&
                  invoice.paymentDetails != null &&
                  invoice.paymentDetails!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.info.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.hourglass_top,
                        size: 16,
                        color: AppColors.info,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Under processing',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.info,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Receipt uploaded',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (showPayAction) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: (isPayEnabled?.call(invoice) ?? true)
                        ? () => onPayNow?.call(invoice)
                        : null,
                    icon: const Icon(Icons.payment, size: 18),
                    label: const Text('Pay Now'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.secondary,
                      foregroundColor: Colors.black,
                      minimumSize: const Size(double.infinity, 44),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                if (!(isPayEnabled?.call(invoice) ?? true))
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      'Payments open from 1st to 7th',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
              ],
              if (showPayAction) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: (isPayEnabled?.call(invoice) ?? true)
                        ? () => onPayNow?.call(invoice)
                        : null,
                    icon: const Icon(Icons.payment, size: 18),
                    label: const Text('Pay Now'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.secondary,
                      foregroundColor: Colors.black,
                      minimumSize: const Size(double.infinity, 44),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                if (!(isPayEnabled?.call(invoice) ?? true))
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      'Payments open from 1st to 7th',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
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
              if (invoice.hasDiscount) ...[
                Text(
                  '₹${(invoice.originalAmount ?? 0).toStringAsFixed(0)}',
                  style: AppTextStyles.h3.copyWith(
                    color: AppColors.textSecondary,
                    decoration: TextDecoration.lineThrough,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
              ],
              Text(
                '₹${(invoice.amount ?? 0).toStringAsFixed(0)}',
                style: AppTextStyles.h1.copyWith(
                  color: _statusColor,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              if (invoice.hasDiscount) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.local_offer, size: 14, color: AppColors.success),
                      const SizedBox(width: 6),
                      Text(
                        '${invoice.discountText} Discount Applied',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.success,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
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
              if (invoice.hasDiscount) ...[
                _DetailRow(
                  icon: Icons.local_offer,
                  title: 'Discount',
                  value: '${invoice.discountPercentage!.toStringAsFixed(0)}% (₹${(invoice.discountAmount ?? 0).toStringAsFixed(0)} saved)',
                ),
              ],
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
                          'Pay via GPay/PhonePe/CRED and upload the payment proof. Fees are due between 1st-5th of every month.',
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    context.findAncestorStateOfType<_StudentFeesScreenState>()?._showPaymentOptions(invoice);
                  },
                  icon: const Icon(Icons.payment),
                  label: const Text('Pay Now'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.secondary,
                    foregroundColor: Colors.black,
                  ),
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
