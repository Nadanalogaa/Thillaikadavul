import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/invoice_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/fee/fee_bloc.dart';
import '../../../bloc/fee/fee_event.dart';
import '../../../bloc/fee/fee_state.dart';

class RecordPaymentScreen extends StatefulWidget {
  final int invoiceId;

  const RecordPaymentScreen({super.key, required this.invoiceId});

  @override
  State<RecordPaymentScreen> createState() => _RecordPaymentScreenState();
}

class _RecordPaymentScreenState extends State<RecordPaymentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _transactionIdController = TextEditingController();
  final _notesController = TextEditingController();

  String _paymentMethod = 'UPI';
  DateTime _paymentDate = DateTime.now();
  InvoiceModel? _invoice;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadInvoice();
  }

  Future<void> _loadInvoice() async {
    try {
      final response = await sl<ApiClient>().getInvoices();
      if (response.statusCode == 200) {
        final invoices = (response.data as List)
            .map((j) => InvoiceModel.fromJson(j))
            .toList();
        _invoice =
            invoices.where((i) => i.id == widget.invoiceId).firstOrNull;
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _transactionIdController.dispose();
    _notesController.dispose();
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
    if (!_formKey.currentState!.validate()) return;

    final paymentData = <String, dynamic>{
      'payment_method': _paymentMethod,
      'payment_date': _paymentDate.toIso8601String(),
      'transaction_id': _transactionIdController.text.trim().isEmpty
          ? null
          : _transactionIdController.text.trim(),
      'notes': _notesController.text.trim().isEmpty
          ? null
          : _notesController.text.trim(),
    };

    context.read<FeeBloc>().add(RecordPayment(
          invoiceId: widget.invoiceId,
          paymentData: paymentData,
        ));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<FeeBloc, FeeState>(
      listener: (context, state) {
        if (state is FeeOperationSuccess) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message)));
          context.pop();
        } else if (state is FeeError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Record Payment'),
          actions: [
            if (_invoice != null && _paymentMethod == 'UPI')
              IconButton(
                icon: const Icon(Icons.qr_code),
                onPressed: () => context.push(
                  '/admin/fees/invoices/${widget.invoiceId}/upi-qr',
                ),
              ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _invoice == null
                ? const Center(child: Text('Invoice not found'))
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Invoice summary card
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Invoice Summary',
                                      style: AppTextStyles.labelLarge),
                                  const SizedBox(height: 8),
                                  _SummaryRow(
                                      label: 'Student',
                                      value: _invoice!.studentName ??
                                          'Student #${_invoice!.studentId}'),
                                  if (_invoice!.courseName != null)
                                    _SummaryRow(
                                        label: 'Course',
                                        value: _invoice!.courseName!),
                                  _SummaryRow(
                                      label: 'Amount',
                                      value:
                                          '\u20B9${_invoice!.amount?.toStringAsFixed(0) ?? '0'}'),
                                  if (_invoice!.billingPeriod != null)
                                    _SummaryRow(
                                        label: 'Period',
                                        value: _invoice!.billingPeriod!),
                                  if (_invoice!.dueDate != null)
                                    _SummaryRow(
                                        label: 'Due Date',
                                        value: _invoice!.dueDate!
                                            .split('T')
                                            .first),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Payment method
                          Text('Payment Details',
                              style: AppTextStyles.labelLarge),
                          const SizedBox(height: 12),
                          SegmentedButton<String>(
                            segments: const [
                              ButtonSegment(
                                  value: 'UPI',
                                  label: Text('UPI'),
                                  icon: Icon(Icons.phone_android)),
                              ButtonSegment(
                                  value: 'Cash',
                                  label: Text('Cash'),
                                  icon: Icon(Icons.money)),
                              ButtonSegment(
                                  value: 'Bank',
                                  label: Text('Bank'),
                                  icon: Icon(Icons.account_balance)),
                            ],
                            selected: {_paymentMethod},
                            onSelectionChanged: (s) =>
                                setState(() => _paymentMethod = s.first),
                          ),
                          const SizedBox(height: 16),

                          // Transaction ID (for UPI and Bank)
                          if (_paymentMethod != 'Cash') ...[
                            TextFormField(
                              controller: _transactionIdController,
                              decoration: InputDecoration(
                                labelText: _paymentMethod == 'UPI'
                                    ? 'UPI Transaction ID'
                                    : 'Bank Reference Number',
                                prefixIcon: const Icon(Icons.tag),
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Payment date
                          InkWell(
                            onTap: _pickDate,
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: 'Payment Date',
                                prefixIcon: Icon(Icons.calendar_today),
                              ),
                              child: Text(
                                '${_paymentDate.day}/${_paymentDate.month}/${_paymentDate.year}',
                                style: AppTextStyles.bodyMedium,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Notes
                          TextFormField(
                            controller: _notesController,
                            decoration: const InputDecoration(
                              labelText: 'Notes (optional)',
                              prefixIcon: Icon(Icons.note),
                            ),
                            maxLines: 2,
                          ),
                          const SizedBox(height: 24),

                          // Show UPI QR button
                          if (_paymentMethod == 'UPI') ...[
                            OutlinedButton.icon(
                              onPressed: () => context.push(
                                '/admin/fees/invoices/${widget.invoiceId}/upi-qr',
                              ),
                              icon: const Icon(Icons.qr_code),
                              label: const Text('Show UPI QR Code'),
                            ),
                            const SizedBox(height: 12),
                          ],

                          BlocBuilder<FeeBloc, FeeState>(
                            builder: (context, state) {
                              final isLoading = state is FeeLoading;
                              return FilledButton(
                                onPressed: isLoading ? null : _submit,
                                child: isLoading
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2),
                                      )
                                    : const Text('Record Payment'),
                              );
                            },
                          ),
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text('$label:',
                style: AppTextStyles.caption
                    .copyWith(fontWeight: FontWeight.w500)),
          ),
          Expanded(child: Text(value, style: AppTextStyles.bodyMedium)),
        ],
      ),
    );
  }
}
