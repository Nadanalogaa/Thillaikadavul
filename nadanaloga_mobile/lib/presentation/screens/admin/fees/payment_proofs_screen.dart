import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/invoice_payment_model.dart';
import '../../../../di/injection_container.dart';

class PaymentProofsScreen extends StatefulWidget {
  const PaymentProofsScreen({super.key});

  @override
  State<PaymentProofsScreen> createState() => _PaymentProofsScreenState();
}

class _PaymentProofsScreenState extends State<PaymentProofsScreen> {
  bool _loading = true;
  List<InvoicePaymentModel> _payments = [];

  @override
  void initState() {
    super.initState();
    _loadPayments();
  }

  Future<void> _loadPayments() async {
    setState(() => _loading = true);
    try {
      final response = await sl<ApiClient>().getInvoicePayments(status: 'submitted');
      if (response.statusCode == 200 && response.data is List) {
        _payments = (response.data as List)
            .map((j) => InvoicePaymentModel.fromJson(j))
            .toList();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _updatePayment(InvoicePaymentModel payment, String status) async {
    try {
      final response = await sl<ApiClient>()
          .updateInvoicePayment(payment.id, {'status': status});
      if (response.statusCode == 200) {
        if (!mounted) return;
        setState(() {
          _payments.removeWhere((p) => p.id == payment.id);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Payment ${status == 'approved' ? 'approved' : 'rejected'}')),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.data?['message'] ?? 'Failed to update payment.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  String _fullUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    return '${ApiEndpoints.baseUrl}$path';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Proofs'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPayments,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _payments.isEmpty
              ? const Center(child: Text('No pending payment proofs'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _payments.length,
                  itemBuilder: (context, index) {
                    final p = _payments[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        title: Text(
                          p.studentName ?? 'Student',
                          style: AppTextStyles.labelLarge,
                        ),
                        subtitle: Text(
                          'Invoice #${p.invoiceId} · ₹${(p.invoiceAmount ?? p.amount ?? 0).toStringAsFixed(0)}',
                          style: AppTextStyles.caption,
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.visibility),
                          onPressed: () => _showDetails(p),
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  void _showDetails(InvoicePaymentModel payment) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) {
        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          minChildSize: 0.4,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Payment Proof', style: AppTextStyles.h4),
                  const SizedBox(height: 12),
                  if (payment.proofUrl != null && payment.proofUrl!.isNotEmpty)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        _fullUrl(payment.proofUrl),
                        height: 260,
                        fit: BoxFit.cover,
                      ),
                    ),
                  const SizedBox(height: 12),
                  Text('Student: ${payment.studentName ?? 'N/A'}'),
                  Text('Invoice: #${payment.invoiceId}'),
                  Text('Amount: ₹${(payment.amount ?? 0).toStringAsFixed(0)}'),
                  if (payment.transactionId != null)
                    Text('Txn ID: ${payment.transactionId}'),
                  if (payment.paymentDate != null)
                    Text('Payment Date: ${payment.paymentDate}'),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _confirmAction(payment, 'approved');
                    },
                    child: const Text('Approve & Mark Paid'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _confirmAction(payment, 'rejected');
                    },
                    child: const Text('Reject'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _confirmAction(InvoicePaymentModel payment, String status) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(status == 'approved' ? 'Approve Payment?' : 'Reject Payment?'),
        content: Text(
          status == 'approved'
              ? 'Mark invoice #${payment.invoiceId} as paid?'
              : 'Reject payment proof for invoice #${payment.invoiceId}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      _updatePayment(payment, status);
    }
  }
}
