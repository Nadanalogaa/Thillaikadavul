import 'package:dio/dio.dart' show Response;
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
import 'order_items_section.dart';
import 'student_payment_proof_screen.dart';
import 'upi_payment_flow.dart';

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
  /// Items the academy offers to order (uniforms, books…); empty if none.
  List<Map<String, dynamic>> _orderable = const [];
  bool _loading = true;
  String? _error;
  int? _payingInvoiceId; // invoice currently in Razorpay checkout

  /// Mirrors online_payments_enabled from /api/household/fees. While Razorpay
  /// is switched off, families pay by UPI and send the receipt instead, so the
  /// screen offers the upload rather than a Pay button that cannot work.
  /// Strict: anything other than an explicit true means the upload path,
  /// which always works, rather than a Pay button that may not.
  bool get _onlinePayments => _fees?['online_payments_enabled'] == true;

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
      // Keep the list on screen while refreshing (e.g. after an order).
      _loading = _fees == null;
      _error = null;
    });
    try {
      // The items list is optional: if it fails, the fees still show.
      final results = await Future.wait([
        _api.getHouseholdFees(),
        _api.getOrderableCharges().then<Response?>((x) => x).catchError((_) => null),
      ]);
      final r = results[0]!;
      final items = results[1];
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is Map) {
        setState(() {
          _fees = Map<String, dynamic>.from(r.data as Map);
          _orderable = items != null && items.statusCode == 200 && items.data is List
              ? (items.data as List)
                  .whereType<Map>()
                  .map((m) => Map<String, dynamic>.from(m))
                  .toList()
              : const [];
        });
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

  Future<void> _uploadReceipt(int invoiceId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => StudentPaymentProofScreen(invoiceId: invoiceId),
      ),
    );
    if (mounted) _load();
  }

  /// Pay one bill by UPI app, then upload the screenshot (online payment is off).
  Future<void> _payByUpi(Map<String, dynamic> inv, int id, double amount) async {
    await payBillsByUpi(context, _fees, [inv]);
    if (mounted) _load();
  }

  List<Map<String, dynamic>> get _payable => payableBills(_fees);

  /// One UPI payment and one screenshot for every payable bill.
  Future<void> _payAll() async {
    await payBillsByUpi(context, _fees, _payable);
    if (mounted) _load();
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
                      OrderItemsSection(items: _orderable, onOrdered: _load),
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
    final verifying = (f['total_verifying'] as num?)?.toDouble() ?? 0;
    // Unpaid extra bills (costumes, uniforms…) and earlier months.
    final otherDue = (f['other_due'] as num?)?.toDouble() ?? 0;
    final allVerifying = due > 0 && verifying >= due;
    final accent = allPaid && otherDue <= 0
        ? AppColors.success
        : allVerifying
            ? AppColors.info
            : AppColors.primary;
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
                    : allVerifying
                        ? 'Payment being verified for $period'
                        : 'Due for $period',
            style: AppTextStyles.labelLarge,
          ),
          if (hasBill) ...[
            const SizedBox(height: 4),
            Text(
              FeeFormat.rupees(allPaid ? paid : due),
              style: AppTextStyles.h3
                  .copyWith(color: accent, fontWeight: FontWeight.w700),
            ),
            if (!allPaid && verifying > 0)
              Text(allVerifying
                      ? 'The academy will confirm your payment soon.'
                      : '${FeeFormat.rupees(verifying)} being verified',
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.info)),
            if (!allPaid && paid > 0)
              Text('${FeeFormat.rupees(paid)} already paid this month',
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary)),
          ],
          if (otherDue > 0)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.add_circle_outline, size: 16, color: AppColors.warning),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '${FeeFormat.rupees(otherDue)} other dues (costumes, uniforms…)',
                      style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          if (!_onlinePayments && _payable.length > 1) ...[
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: _payAll,
              icon: const Icon(Icons.payments_outlined, size: 18),
              label: Text(uploadOnly(_fees)
                  ? 'Upload one screenshot for all ${FeeFormat.rupees(billsTotal(_payable))}'
                  : 'Pay all ${FeeFormat.rupees(billsTotal(_payable))} (${_payable.length} bills)'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(44)),
            ),
            const SizedBox(height: 4),
            Text(uploadOnly(_fees)
                    ? 'Paid them together? Upload one screenshot for all ${_payable.length} bills, or each bill below.'
                    : 'One payment and one screenshot for all of them, or pay each bill below.',
                style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
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
    // Unpaid bills outside this month: extra bills and earlier months.
    final period = '${_fees?['period'] ?? ''}';
    final otherDue = invoices
        .where((i) =>
            '${i['billing_period'] ?? ''}' != period &&
            '${i['status'] ?? ''}'.toLowerCase() != 'paid')
        .fold<double>(0, (t, i) => t + ((i['amount'] as num?)?.toDouble() ?? 0));
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: monthDue > 0 || otherDue > 0,
          leading: CircleAvatar(
            backgroundColor: AppColors.primary.withValues(alpha: 0.12),
            child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
                style: AppTextStyles.labelLarge
                    .copyWith(color: AppColors.primary)),
          ),
          title: Text(name, style: AppTextStyles.labelLarge),
          subtitle: Text(
            [
              monthDue > 0
                  ? '${FeeFormat.rupees(monthDue)} due this month'
                  : 'Nothing due this month',
              if (otherDue > 0) '+ ${FeeFormat.rupees(otherDue)} other',
            ].join(' · '),
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

  /// "₹1,400 − 10% discount ₹140 = ₹1,260" for a discounted bill, else null.
  String? _discountLine(Map<String, dynamic> inv, double amount) {
    double? n(dynamic v) => v is num ? v.toDouble() : double.tryParse('${v ?? ''}');
    final off = n(inv['discount_amount']) ?? 0;
    final full = n(inv['original_amount']) ?? 0;
    if (off <= 0 || full <= 0) return null;
    final pct = n(inv['discount_percentage']) ?? 0;
    final pctText = pct > 0 ? '${pct % 1 == 0 ? pct.toStringAsFixed(0) : pct.toString()}% ' : '';
    return '${FeeFormat.rupees(full)} − ${pctText}discount ${FeeFormat.rupees(off)} = ${FeeFormat.rupees(amount)}';
  }

  Widget _invoiceRow(Map<String, dynamic> inv) {
    final id =
        inv['id'] is int ? inv['id'] as int : int.tryParse('${inv['id']}') ?? 0;
    final amount = (inv['amount'] as num?)?.toDouble() ?? 0;
    final status = '${inv['status'] ?? 'pending'}'.toLowerCase();
    final isPaid = status == 'paid';
    // The family's latest screenshot: waiting for the academy, or not accepted.
    final proof = '${inv['proof_status'] ?? ''}'.toLowerCase();
    final verifying = !isPaid && proof == 'submitted';
    final rejected = !isPaid && proof == 'rejected';
    final proofNote = '${inv['proof_note'] ?? ''}'.trim();
    final statusColor = isPaid
        ? AppColors.success
        : verifying
            ? AppColors.info
            : (status == 'overdue' ? AppColors.error : AppColors.warning);
    final statusText = verifying ? 'Being verified' : status[0].toUpperCase() + status.substring(1);
    final receiptNo = '${inv['receipt_number'] ?? ''}'.trim();
    final method = FeeFormat.method(
        inv['payment_method'] == null ? null : '${inv['payment_method']}');
    final canPay = !isPaid && !verifying;
    final longLabel = !_onlinePayments && uploadOnly(_fees);
    final Widget payButton = _onlinePayments
        ? FilledButton(
            onPressed: id == 0 ? null : () => _pay(id),
            style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 14)),
            child: const Text('Pay'),
          )
        : FilledButton(
            onPressed: id == 0 ? null : () => _payByUpi(inv, id, amount),
            style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 14)),
            child: Text(uploadOnly(_fees)
                ? (rejected ? 'Upload again' : 'Upload screenshot')
                : (rejected ? 'Pay again' : 'Pay')),
          );
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
                    if (_discountLine(inv, amount) != null)
                      Text(_discountLine(inv, amount)!,
                          style: AppTextStyles.caption
                              .copyWith(color: AppColors.success, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(FeeFormat.rupees(amount),
                      style: AppTextStyles.labelLarge),
                  Text(statusText,
                      style:
                          AppTextStyles.caption.copyWith(color: statusColor)),
                ],
              ),
              if (canPay && !longLabel) ...[
                const SizedBox(width: 10),
                payButton,
              ],
            ],
          ),
          // "Upload screenshot" is too long to sit beside a bill name on a
          // narrow phone, so it gets its own line.
          if (canPay && longLabel)
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.only(top: 6),
                child: payButton,
              ),
            ),
          if (verifying)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  const Icon(Icons.hourglass_top, size: 14, color: AppColors.info),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text('Payment received — the academy will confirm it soon.',
                        style: AppTextStyles.caption.copyWith(color: AppColors.info)),
                  ),
                ],
              ),
            ),
          if (rejected)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                'Screenshot not accepted${proofNote.isNotEmpty ? ': $proofNote' : ''}. Please pay or upload again.',
                style: AppTextStyles.caption.copyWith(color: AppColors.error),
              ),
            ),
          if (!isPaid && !verifying && _onlinePayments && id != 0)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _uploadReceipt(id),
                icon: const Icon(Icons.upload_file, size: 16),
                label: const Text('Paid by UPI? Upload receipt'),
                style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    visualDensity: VisualDensity.compact),
              ),
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
