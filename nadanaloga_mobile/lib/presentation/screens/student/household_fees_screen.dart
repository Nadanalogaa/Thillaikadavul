import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../../../core/payments/web_razorpay.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/fee_format.dart';
import '../../../di/injection_container.dart';
import '../../widgets/receipt_sheet.dart';

/// Household fees drilldown: this month's total → per student → each invoice,
/// with "Pay" on any pending invoice of any student in the household. The
/// server authorises payment by household membership, so a parent can pay a
/// child's invoice from here without switching dashboards.
class HouseholdFeesScreen extends StatefulWidget {
  const HouseholdFeesScreen({super.key});

  @override
  State<HouseholdFeesScreen> createState() => _HouseholdFeesScreenState();
}

class _HouseholdFeesScreenState extends State<HouseholdFeesScreen> {
  final _api = sl<ApiClient>();
  late final Razorpay _razorpay;
  Map<String, dynamic>? _fees;
  bool _loading = true;
  String? _error;
  int? _payingInvoiceId; // invoice currently in Razorpay checkout

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _onSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _onError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _onWallet);
    _load();
  }

  @override
  void dispose() {
    _razorpay.clear();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await _api.getHouseholdFees();
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is Map) {
        setState(() => _fees = Map<String, dynamic>.from(r.data as Map));
      } else {
        setState(() => _error = 'Could not load fees.');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load fees.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String msg, {bool error = true}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.error : AppColors.success,
    ));
  }

  Future<void> _pay(int invoiceId) async {
    try {
      final r = await _api.createRazorpayOrder(invoiceId);
      if (!mounted) return;
      if (r.statusCode != 200 || r.data is! Map) {
        final msg = (r.data is Map ? r.data['message'] : null) ??
            'Could not start payment.';
        _snack('$msg');
        return;
      }
      final d = Map<String, dynamic>.from(r.data as Map);
      _payingInvoiceId = invoiceId;
      final prefill = (d['prefill'] as Map?) ?? {};
      final options = <String, dynamic>{
        'key': d['key_id'],
        'order_id': d['order_id'],
        'amount': d['amount'],
        'currency': d['currency'] ?? 'INR',
        'name': d['name'] ?? 'Nadanaloga Academy',
        'description': d['description'] ?? 'Fee payment',
        'prefill': {
          'name': prefill['name'] ?? '',
          'email': prefill['email'] ?? '',
          'contact': prefill['contact'] ?? '',
        },
      };
      // Server-controlled options: notes (so the webhook finds the bill) and,
      // when enabled, UPI-only with Google Pay / PhonePe.
      final checkout = d['checkout'];
      if (checkout is Map) options.addAll(Map<String, dynamic>.from(checkout));
      if (kIsWeb) {
        // iPhone web app: the plugin has no web support, so use Razorpay's own
        // web checkout and feed its result into the same handlers.
        await openWebRazorpay(
          options,
          onSuccess: (paymentId, orderId, signature) => _onSuccess(
              PaymentSuccessResponse(paymentId, orderId, signature, null)),
          onFailure: (message) {
            _payingInvoiceId = null;
            if (message != 'Payment cancelled.') _snack(message);
          },
        );
        return;
      }
      _razorpay.open(options);
    } catch (e) {
      debugPrint('[Pay] could not start payment: $e');
      _snack('Could not start payment.');
    }
  }

  Future<void> _onSuccess(PaymentSuccessResponse res) async {
    final id = _payingInvoiceId;
    if (id == null) return;
    try {
      await _api.verifyRazorpayPayment(
        orderId: res.orderId ?? '',
        paymentId: res.paymentId ?? '',
        signature: res.signature ?? '',
        invoiceId: id,
      );
      _snack('Payment successful.', error: false);
      _load();
    } catch (_) {
      _snack('Paid, but verification failed. Please contact the academy.');
    }
  }

  void _onError(PaymentFailureResponse res) {
    _snack(res.message ?? 'Payment failed.');
  }

  void _onWallet(ExternalWalletResponse res) {}

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Fees'),
        backgroundColor: AppColors.studentAccent,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, style: AppTextStyles.bodyMedium),
                      const SizedBox(height: 8),
                      TextButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _summary(),
                      const SizedBox(height: 16),
                      ..._studentSections(),
                    ],
                  ),
                ),
    );
  }

  Widget _summary() {
    final f = _fees ?? const {};
    final period = '${f['period'] ?? ''}';
    final hasBill = f['has_bill'] == true;
    final allPaid = f['all_paid'] == true;
    final due = (f['total_due'] as num?)?.toDouble() ?? 0;
    final paid = (f['total_paid'] as num?)?.toDouble() ?? 0;
    final accent = allPaid ? AppColors.success : AppColors.primary;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: accent.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            !hasBill
                ? 'No fees generated for $period yet'
                : allPaid
                    ? 'Paid for $period'
                    : 'Due for $period',
            style: AppTextStyles.labelLarge,
          ),
          if (hasBill) ...[
            const SizedBox(height: 4),
            Text(
              '₹${(allPaid ? paid : due).toStringAsFixed(0)}',
              style: AppTextStyles.h3
                  .copyWith(color: accent, fontWeight: FontWeight.w700),
            ),
            if (!allPaid && paid > 0)
              Text('₹${paid.toStringAsFixed(0)} already paid this month',
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary)),
          ],
        ],
      ),
    );
  }

  List<Widget> _studentSections() {
    final students = ((_fees?['students'] as List?) ?? const [])
        .cast<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .toList();
    if (students.isEmpty) {
      return [
        Padding(
          padding: const EdgeInsets.only(top: 24),
          child: Text('No invoices yet.',
              textAlign: TextAlign.center,
              style: AppTextStyles.bodyMedium
                  .copyWith(color: AppColors.textSecondary)),
        ),
      ];
    }
    return [
      for (final s in students) _studentCard(s),
    ];
  }

  Widget _studentCard(Map<String, dynamic> s) {
    final name = '${s['student_name'] ?? 'Student'}';
    final monthDue = (s['month_due'] as num?)?.toDouble() ?? 0;
    final invoices = ((s['invoices'] as List?) ?? const [])
        .cast<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .toList();
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: monthDue > 0,
          leading: CircleAvatar(
            backgroundColor: AppColors.primary.withValues(alpha: 0.12),
            child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
                style: AppTextStyles.labelLarge
                    .copyWith(color: AppColors.primary)),
          ),
          title: Text(name, style: AppTextStyles.labelLarge),
          subtitle: Text(
            monthDue > 0
                ? '₹${monthDue.toStringAsFixed(0)} due this month'
                : 'Nothing due this month',
            style:
                AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
          ),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          children: [
            if (invoices.isEmpty)
              Text('No invoices.',
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary)),
            for (final inv in invoices) _invoiceRow(inv),
          ],
        ),
      ),
    );
  }

  Widget _invoiceRow(Map<String, dynamic> inv) {
    final id =
        inv['id'] is int ? inv['id'] as int : int.tryParse('${inv['id']}') ?? 0;
    final amount = (inv['amount'] as num?)?.toDouble() ?? 0;
    final status = '${inv['status'] ?? 'pending'}'.toLowerCase();
    final isPaid = status == 'paid';
    final statusColor = isPaid
        ? AppColors.success
        : (status == 'overdue' ? AppColors.error : AppColors.warning);
    final receiptNo = '${inv['receipt_number'] ?? ''}'.trim();
    final method = FeeFormat.method(
        inv['payment_method'] == null ? null : '${inv['payment_method']}');
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${inv['course_name'] ?? 'Fee'}',
                        style: AppTextStyles.bodyMedium),
                    Text('${inv['billing_period'] ?? ''}',
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textSecondary)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('₹${amount.toStringAsFixed(0)}',
                      style: AppTextStyles.labelLarge),
                  Text(status[0].toUpperCase() + status.substring(1),
                      style:
                          AppTextStyles.caption.copyWith(color: statusColor)),
                ],
              ),
              if (!isPaid) ...[
                const SizedBox(width: 10),
                FilledButton(
                  onPressed: id == 0 ? null : () => _pay(id),
                  style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 14)),
                  child: const Text('Pay'),
                ),
              ],
            ],
          ),
          if (isPaid && receiptNo.isNotEmpty)
            InkWell(
              onTap: () => showReceiptSheet(context, receiptNo),
              borderRadius: BorderRadius.circular(6),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    const Icon(Icons.receipt_long,
                        size: 14, color: AppColors.success),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        method.isEmpty
                            ? 'Receipt $receiptNo'
                            : 'Receipt $receiptNo · $method',
                        style: AppTextStyles.caption.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w500),
                      ),
                    ),
                    const Icon(Icons.chevron_right,
                        size: 16, color: AppColors.primary),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
