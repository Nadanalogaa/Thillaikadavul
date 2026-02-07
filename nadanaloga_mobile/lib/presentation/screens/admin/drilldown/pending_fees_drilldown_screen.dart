import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../data/models/invoice_model.dart';
import '../../../bloc/fee/fee_bloc.dart';
import '../../../bloc/fee/fee_event.dart';
import '../../../bloc/fee/fee_state.dart';
import '../../../widgets/empty_state_widget.dart';

class PendingFeesDrilldownScreen extends StatefulWidget {
  const PendingFeesDrilldownScreen({super.key});

  @override
  State<PendingFeesDrilldownScreen> createState() => _PendingFeesDrilldownScreenState();
}

class _PendingFeesDrilldownScreenState extends State<PendingFeesDrilldownScreen> {
  String? _selectedMonth;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    context.read<FeeBloc>().add(LoadInvoices());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String _getMonthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  }

  String _getMonthKey(InvoiceModel invoice) {
    // Try to parse from billing_period or due_date
    if (invoice.billingPeriod != null && invoice.billingPeriod!.isNotEmpty) {
      return invoice.billingPeriod!;
    }
    if (invoice.dueDate != null) {
      try {
        final date = DateTime.parse(invoice.dueDate!);
        return '${_getMonthName(date.month)} ${date.year}';
      } catch (_) {}
    }
    return 'Unknown';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Pending Fees'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.white,
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by student name, course...',
                hintStyle: AppTextStyles.bodySmall.copyWith(color: AppColors.textHint),
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 20),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: AppColors.divider),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: AppColors.divider),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.warning, width: 1.5),
                ),
                filled: true,
                fillColor: AppColors.background,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                isDense: true,
              ),
              style: AppTextStyles.bodyMedium,
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),

          // Content
          Expanded(
            child: BlocBuilder<FeeBloc, FeeState>(
              builder: (context, state) {
                if (state is FeeLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                List<InvoiceModel> pendingInvoices = [];
                if (state is InvoicesLoaded) {
                  pendingInvoices = state.invoices
                      .where((i) => i.isPending || i.isOverdue)
                      .toList();
                }

                // Apply search
                if (_searchQuery.isNotEmpty) {
                  final query = _searchQuery.toLowerCase();
                  pendingInvoices = pendingInvoices.where((i) {
                    return (i.studentName?.toLowerCase().contains(query) ?? false) ||
                        (i.courseName?.toLowerCase().contains(query) ?? false) ||
                        (i.studentEmail?.toLowerCase().contains(query) ?? false);
                  }).toList();
                }

                if (pendingInvoices.isEmpty) {
                  return EmptyStateWidget(
                    icon: Icons.check_circle_outline,
                    title: _searchQuery.isNotEmpty ? 'No Results' : 'No Pending Fees',
                    subtitle: _searchQuery.isNotEmpty
                        ? 'Try a different search term'
                        : 'All fees have been collected!',
                  );
                }

                // Group by month
                final monthlyInvoices = <String, List<InvoiceModel>>{};
                for (final invoice in pendingInvoices) {
                  final monthKey = _getMonthKey(invoice);
                  monthlyInvoices.putIfAbsent(monthKey, () => []).add(invoice);
                }

                // Calculate totals
                final totalPending = pendingInvoices.fold<double>(0, (sum, i) => sum + (i.amount ?? 0));
                final overdueCount = pendingInvoices.where((i) => i.isOverdue).length;

                // Filter by selected month
                List<InvoiceModel> displayInvoices;
                if (_selectedMonth == null || _selectedMonth == 'All') {
                  displayInvoices = pendingInvoices;
                } else {
                  displayInvoices = monthlyInvoices[_selectedMonth] ?? [];
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<FeeBloc>().add(LoadInvoices());
                  },
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    children: [
                      // Summary Card
                      _PendingSummaryCard(
                        totalPending: totalPending,
                        pendingCount: pendingInvoices.length,
                        overdueCount: overdueCount,
                      ).animate().fadeIn(duration: 300.ms),
                      const SizedBox(height: 12),

                      // Month Filter Chips
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _MonthChip(
                              label: 'All',
                              count: pendingInvoices.length,
                              isSelected: _selectedMonth == null || _selectedMonth == 'All',
                              onTap: () => setState(() => _selectedMonth = 'All'),
                            ),
                            ...monthlyInvoices.entries.map((entry) {
                              return _MonthChip(
                                label: entry.key,
                                count: entry.value.length,
                                isSelected: _selectedMonth == entry.key,
                                onTap: () => setState(() => _selectedMonth = entry.key),
                              );
                            }),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Invoice List
                      ...displayInvoices.asMap().entries.map((entry) {
                        return _PendingInvoiceCard(
                          invoice: entry.value,
                          index: entry.key,
                          onMarkPaid: () => _showQuickPaymentSheet(context, entry.value),
                        );
                      }),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showQuickPaymentSheet(BuildContext context, InvoiceModel invoice) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _QuickPaymentSheet(
        invoice: invoice,
        onPaymentRecorded: () {
          context.read<FeeBloc>().add(LoadInvoices());
        },
      ),
    );
  }
}

class _PendingSummaryCard extends StatelessWidget {
  final double totalPending;
  final int pendingCount;
  final int overdueCount;

  const _PendingSummaryCard({
    required this.totalPending,
    required this.pendingCount,
    required this.overdueCount,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.warning, AppColors.warning.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.pending_actions, color: Colors.white, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '₹${totalPending.toStringAsFixed(0)}',
                      style: AppTextStyles.h2.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Total Pending',
                      style: AppTextStyles.bodySmall.copyWith(color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '$pendingCount',
                        style: AppTextStyles.h3.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                      Text('Invoices', style: AppTextStyles.caption.copyWith(color: Colors.white70)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: overdueCount > 0 ? AppColors.error.withOpacity(0.3) : Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '$overdueCount',
                        style: AppTextStyles.h3.copyWith(
                          color: overdueCount > 0 ? Colors.white : Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text('Overdue', style: AppTextStyles.caption.copyWith(color: Colors.white70)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MonthChip extends StatelessWidget {
  final String label;
  final int count;
  final bool isSelected;
  final VoidCallback onTap;

  const _MonthChip({
    required this.label,
    required this.count,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.warning : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppColors.warning : AppColors.divider,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: AppTextStyles.caption.copyWith(
                  color: isSelected ? Colors.white : AppColors.textPrimary,
                  fontWeight: FontWeight.w500,
                  fontSize: 11,
                ),
              ),
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white.withOpacity(0.3) : AppColors.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : AppColors.warning,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PendingInvoiceCard extends StatelessWidget {
  final InvoiceModel invoice;
  final int index;
  final VoidCallback onMarkPaid;

  const _PendingInvoiceCard({
    required this.invoice,
    required this.index,
    required this.onMarkPaid,
  });

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOverdue = invoice.isOverdue;
    final statusColor = isOverdue ? AppColors.error : AppColors.warning;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: statusColor.withOpacity(0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                // Student Avatar
                CircleAvatar(
                  radius: 20,
                  backgroundColor: AppColors.studentAccent.withOpacity(0.1),
                  child: Text(
                    (invoice.studentName ?? 'S')[0].toUpperCase(),
                    style: AppTextStyles.labelLarge.copyWith(color: AppColors.studentAccent),
                  ),
                ),
                const SizedBox(width: 10),

                // Student & Course Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        invoice.studentName ?? 'Student #${invoice.studentId}',
                        style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Row(
                        children: [
                          if (invoice.courseName != null) ...[
                            Text(
                              invoice.courseName!,
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.primary,
                                fontSize: 11,
                              ),
                            ),
                            const SizedBox(width: 8),
                          ],
                          Text(
                            invoice.billingPeriod ?? '',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Amount & Status
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '₹${invoice.amount?.toStringAsFixed(0) ?? '0'}',
                      style: AppTextStyles.labelLarge.copyWith(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isOverdue ? 'OVERDUE' : 'PENDING',
                        style: AppTextStyles.caption.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.w600,
                          fontSize: 9,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 10),

            // Due Date & Mark Paid Button
            Row(
              children: [
                Icon(Icons.calendar_today, size: 14, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text(
                  'Due: ${_formatDate(invoice.dueDate)}',
                  style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: onMarkPaid,
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
        ),
      ),
    ).animate(delay: Duration(milliseconds: 30 * index)).fadeIn(duration: 200.ms);
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
              content: Text('Payment recorded for ${widget.invoice.studentName}'),
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
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.studentAccent.withOpacity(0.1),
                    child: Text(
                      (widget.invoice.studentName ?? 'S')[0].toUpperCase(),
                      style: AppTextStyles.labelLarge.copyWith(color: AppColors.studentAccent),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.invoice.studentName ?? 'Student',
                          style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          '${widget.invoice.courseName ?? ''} - ${widget.invoice.billingPeriod ?? ''}',
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
