import 'package:flutter/material.dart';

import '../../../core/utils/fee_format.dart';
import '../../widgets/upi_pay_sheet.dart';
import 'student_payment_proof_screen.dart';

/// Paying bills by UPI while online payment is off, shared by the home
/// screen's Pay button and the Fees screen: the UPI sheet (apps, QR, UPI ID),
/// then the screenshot upload — one bill, or several bills with one
/// screenshot. `fees` is the response of GET /api/household/fees.

/// Every bill the family can pay now: unpaid and not already waiting for the
/// academy to check a screenshot. Each carries its student's name.
List<Map<String, dynamic>> payableBills(Map<String, dynamic>? fees) {
  final out = <Map<String, dynamic>>[];
  for (final s in (fees?['students'] as List? ?? const [])) {
    if (s is! Map) continue;
    for (final inv in (s['invoices'] as List? ?? const [])) {
      if (inv is! Map) continue;
      final status = '${inv['status'] ?? ''}'.toLowerCase();
      final proof = '${inv['proof_status'] ?? ''}'.toLowerCase();
      if (status != 'paid' && proof != 'submitted') {
        out.add({...Map<String, dynamic>.from(inv), 'student_name': s['student_name']});
      }
    }
  }
  return out;
}

double billsTotal(List<Map<String, dynamic>> bills) =>
    bills.fold<double>(0, (t, b) => t + ((b['amount'] as num?)?.toDouble() ?? 0));

int _idOf(Map<String, dynamic> b) => b['id'] is int ? b['id'] as int : int.tryParse('${b['id']}') ?? 0;

/// Show the UPI sheet for [bills] and, when the family says they paid, the
/// screenshot upload. Returns when they are done (the caller reloads).
Future<void> payBillsByUpi(
  BuildContext context,
  Map<String, dynamic>? fees,
  List<Map<String, dynamic>> bills,
) async {
  final ids = bills.map(_idOf).where((i) => i > 0).toList();
  if (ids.isEmpty) return;
  final total = billsTotal(bills);
  final upi = fees?['upi'] is Map ? Map<String, dynamic>.from(fees!['upi'] as Map) : const <String, dynamic>{};
  final upiId = '${upi['id'] ?? ''}'.trim();
  final single = ids.length == 1;
  final first = bills.first;

  if (upiId.isNotEmpty) {
    final note = single
        ? 'NDA bill ${ids.first}'
        : ids.length <= 4
            ? 'NDA bills ${ids.join('+')}'
            : 'NDA ${ids.length} bills ${ids.first}';
    final forWhat = single
        ? '${first['course_name'] ?? 'Fee'} · ${first['billing_period'] ?? ''}'
        : '${ids.length} bills';
    final upload = await showUpiPaySheet(
      context,
      upiId: upiId,
      payeeName: '${upi['name'] ?? 'Nadanaloga'}',
      amount: total,
      note: note,
      forWhat: forWhat,
      extra: upi['extra'] is Map
          ? (upi['extra'] as Map).map((k, v) => MapEntry('$k', '$v'))
          : const <String, String>{},
      // Off by default for a bank merchant ID (see the server's upi_prefill_amount).
      prefillAmount: upi['prefill_amount'] == true,
    );
    if (!upload || !context.mounted) return;
  }

  await Navigator.of(context).push(MaterialPageRoute(
    builder: (_) => single
        ? StudentPaymentProofScreen(invoiceId: ids.first)
        : StudentPaymentProofScreen(
            invoiceId: ids.first,
            groupInvoiceIds: ids,
            groupLines: [
              for (final b in bills)
                '${b['student_name'] ?? ''} · ${b['course_name'] ?? 'Fee'} · ${b['billing_period'] ?? ''} · ${FeeFormat.rupees((b['amount'] as num?)?.toDouble() ?? 0)}',
            ],
            groupTotal: total,
          ),
  ));
}
