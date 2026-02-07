import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/upi_qr_generator.dart';
import '../../../../data/models/invoice_model.dart';
import '../../../../di/injection_container.dart';

class UpiQrDisplayScreen extends StatefulWidget {
  final int invoiceId;

  const UpiQrDisplayScreen({super.key, required this.invoiceId});

  @override
  State<UpiQrDisplayScreen> createState() => _UpiQrDisplayScreenState();
}

class _UpiQrDisplayScreenState extends State<UpiQrDisplayScreen> {
  // TODO: Make this configurable from settings
  static const String _academyUpiId = 'nadanaloga@upi';
  static const String _academyName = 'Nadanaloga Fine Arts Academy';

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
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('UPI Payment')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _invoice == null
              ? const Center(child: Text('Invoice not found'))
              : _buildQrContent(),
    );
  }

  Widget _buildQrContent() {
    final amount = _invoice!.amount ?? 0.0;
    final note =
        'Fee payment - ${_invoice!.courseName ?? "Invoice"} #${_invoice!.id}';

    final upiUri = UpiQrGenerator.generateUpiUri(
      upiId: _academyUpiId,
      payeeName: _academyName,
      amount: amount,
      transactionNote: note,
    );

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Icon(Icons.account_balance,
                      size: 32, color: AppColors.primary),
                  const SizedBox(height: 8),
                  Text(_academyName,
                      style: AppTextStyles.labelLarge,
                      textAlign: TextAlign.center),
                  const SizedBox(height: 4),
                  Text(_academyUpiId,
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.primary)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // QR Code
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Text('Scan to Pay',
                      style: AppTextStyles.labelLarge
                          .copyWith(color: AppColors.textSecondary)),
                  const SizedBox(height: 16),
                  QrImageView(
                    data: upiUri,
                    version: QrVersions.auto,
                    size: 220,
                    backgroundColor: Colors.white,
                    eyeStyle: const QrEyeStyle(
                      eyeShape: QrEyeShape.circle,
                      color: AppColors.primary,
                    ),
                    dataModuleStyle: const QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.circle,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '\u20B9${amount.toStringAsFixed(0)}',
                    style: AppTextStyles.h2
                        .copyWith(color: AppColors.primary),
                  ),
                  const SizedBox(height: 4),
                  if (_invoice!.studentName != null)
                    Text(
                      'Student: ${_invoice!.studentName}',
                      style: AppTextStyles.bodyMedium,
                    ),
                  if (_invoice!.courseName != null)
                    Text(
                      _invoice!.courseName!,
                      style: AppTextStyles.caption,
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Copy UPI ID button
          OutlinedButton.icon(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: _academyUpiId));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('UPI ID copied to clipboard')),
              );
            },
            icon: const Icon(Icons.copy),
            label: const Text('Copy UPI ID'),
          ),
          const SizedBox(height: 8),

          // Instructions
          Card(
            color: AppColors.info.withValues(alpha: 0.08),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('How to pay:',
                      style: AppTextStyles.labelLarge
                          .copyWith(color: AppColors.info)),
                  const SizedBox(height: 8),
                  _InstructionStep(
                      number: '1',
                      text: 'Open any UPI app (GPay, PhonePe, Paytm)'),
                  _InstructionStep(
                      number: '2', text: 'Scan this QR code'),
                  _InstructionStep(
                      number: '3',
                      text:
                          'Verify amount (\u20B9${amount.toStringAsFixed(0)}) and pay'),
                  _InstructionStep(
                      number: '4',
                      text:
                          'Share the transaction ID with the admin'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _InstructionStep extends StatelessWidget {
  final String number;
  final String text;

  const _InstructionStep({required this.number, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 10,
            backgroundColor: AppColors.info,
            child: Text(number,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 8),
          Expanded(
              child: Text(text, style: AppTextStyles.bodyMedium)),
        ],
      ),
    );
  }
}
