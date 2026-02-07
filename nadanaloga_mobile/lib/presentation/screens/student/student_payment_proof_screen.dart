import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/invoice_model.dart';
import '../../../di/injection_container.dart';

class StudentPaymentProofScreen extends StatefulWidget {
  final int invoiceId;

  const StudentPaymentProofScreen({super.key, required this.invoiceId});

  @override
  State<StudentPaymentProofScreen> createState() =>
      _StudentPaymentProofScreenState();
}

class _StudentPaymentProofScreenState extends State<StudentPaymentProofScreen> {
  final _transactionController = TextEditingController();
  DateTime? _paymentDate;
  File? _proofFile;
  InvoiceModel? _invoice;
  bool _loading = true;
  bool _submitting = false;
  bool _submitted = false;

  @override
  void initState() {
    super.initState();
    _loadInvoice();
  }

  @override
  void dispose() {
    _transactionController.dispose();
    super.dispose();
  }

  Future<void> _loadInvoice() async {
    try {
      final response = await sl<ApiClient>().getInvoices();
      if (response.statusCode == 200 && response.data is List) {
        final invoices = (response.data as List)
            .map((j) => InvoiceModel.fromJson(j))
            .toList();
        _invoice = invoices.where((i) => i.id == widget.invoiceId).firstOrNull;
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (image != null) {
      setState(() {
        _proofFile = File(image.path);
      });
    }
  }

  Future<void> _submitProof() async {
    if (_proofFile == null || _invoice == null) return;

    setState(() => _submitting = true);
    try {
      final paymentDate =
          _paymentDate?.toIso8601String().split('T').first ?? '';
      final response = await sl<ApiClient>().submitInvoicePaymentProof(
        invoiceId: _invoice!.id,
        proofPath: _proofFile!.path,
        transactionId: _transactionController.text.trim().isEmpty
            ? null
            : _transactionController.text.trim(),
        paymentDate: paymentDate.isEmpty ? null : paymentDate,
        paymentMethod: 'UPI',
        amount: _invoice!.amount,
      );

      if (!mounted) return;
      if (response.statusCode == 201) {
        setState(() => _submitted = true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment proof submitted successfully.')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              response.data?['message'] ?? 'Failed to submit payment proof.',
            ),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit proof: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _shareProof() async {
    if (_proofFile == null || _invoice == null) return;
    final text =
        'Payment proof for Invoice #${_invoice!.id}\nAmount: ₹${(_invoice!.amount ?? 0).toStringAsFixed(0)}\nCourse: ${_invoice!.courseName ?? 'N/A'}\nDate: ${_paymentDate?.toIso8601String().split('T').first ?? 'N/A'}\nTxn ID: ${_transactionController.text.trim().isEmpty ? 'N/A' : _transactionController.text.trim()}';

    await Share.shareXFiles(
      [XFile(_proofFile!.path)],
      text: text,
    );
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _paymentDate ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: now,
    );
    if (date != null) {
      setState(() => _paymentDate = date);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Submit Payment Proof')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _invoice == null
              ? const Center(child: Text('Invoice not found'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _InvoiceSummaryCard(invoice: _invoice!),
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: _pickImage,
                        icon: const Icon(Icons.upload_file),
                        label: Text(
                          _proofFile == null
                              ? 'Upload Payment Screenshot'
                              : 'Change Screenshot',
                        ),
                      ),
                      if (_proofFile != null) ...[
                        const SizedBox(height: 12),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.file(_proofFile!, height: 220, fit: BoxFit.cover),
                        ),
                      ],
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _transactionController,
                        decoration: const InputDecoration(
                          labelText: 'Transaction ID (optional)',
                          prefixIcon: Icon(Icons.confirmation_number),
                        ),
                      ),
                      const SizedBox(height: 12),
                      InkWell(
                        onTap: _pickDate,
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Payment Date',
                            prefixIcon: Icon(Icons.calendar_today),
                          ),
                          child: Text(
                            _paymentDate == null
                                ? 'Select date'
                                : _paymentDate!
                                    .toIso8601String()
                                    .split('T')
                                    .first,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed:
                            _submitting || _proofFile == null ? null : _submitProof,
                        child: _submitting
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Submit Proof'),
                      ),
                      const SizedBox(height: 12),
                      if (_submitted)
                        OutlinedButton.icon(
                          onPressed: _shareProof,
                          icon: const Icon(Icons.share),
                          label: const Text('Share via WhatsApp'),
                        ),
                      const SizedBox(height: 16),
                      if (_submitted)
                        Text(
                          'Your payment proof is submitted. Admin will review and confirm.',
                          style: AppTextStyles.caption.copyWith(
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

class _InvoiceSummaryCard extends StatelessWidget {
  final InvoiceModel invoice;

  const _InvoiceSummaryCard({required this.invoice});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              invoice.courseName ?? 'Invoice',
              style: AppTextStyles.labelLarge,
            ),
            const SizedBox(height: 6),
            Text(
              'Invoice #${invoice.id}',
              style: AppTextStyles.caption,
            ),
            const SizedBox(height: 12),
            Text(
              '₹${(invoice.amount ?? 0).toStringAsFixed(0)}',
              style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              'Due: ${invoice.dueDate?.split('T').first ?? 'N/A'}',
              style: AppTextStyles.caption,
            ),
          ],
        ),
      ),
    );
  }
}
