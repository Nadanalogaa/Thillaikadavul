import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/fee_format.dart';
import '../../../../core/utils/media_url.dart';
import '../../../../data/models/fee_roster_model.dart';
import '../../../../di/injection_container.dart';

/// A student's payment screenshot(s) waiting to be checked: the picture, the
/// bills it pays, the UTR, and Approve (paid, one receipt — a brother's or
/// sister's bill on the same screenshot too) or Reject (the family sees the
/// reason and can upload again). Resolves to true when something changed.
Future<bool> showProofReviewSheet(BuildContext context, FeeRosterRow row) async {
  final changed = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: AppColors.surface,
    builder: (_) => _ProofReviewSheet(row: row),
  );
  return changed == true;
}

class _ProofReviewSheet extends StatefulWidget {
  final FeeRosterRow row;
  const _ProofReviewSheet({required this.row});

  @override
  State<_ProofReviewSheet> createState() => _ProofReviewSheetState();
}

class _ProofReviewSheetState extends State<_ProofReviewSheet> {
  bool _busy = false;
  String? _error;
  String? _done;

  List<FeeRosterBill> get _waiting => widget.row.bills.where((b) => b.screenshotWaiting).toList();

  /// One entry per screenshot (bills of a "Pay all" share the picture).
  List<FeeRosterBill> get _shots {
    final seen = <String>{};
    final out = <FeeRosterBill>[];
    for (final b in _waiting) {
      final key = b.proofUrl ?? 'p${b.proofPaymentId}';
      if (seen.add(key)) out.add(b);
    }
    return out;
  }

  Future<void> _decide(bool approve) async {
    String? notes;
    if (!approve) {
      notes = await _askReason();
      if (notes == null) return;
    }
    setState(() { _busy = true; _error = null; });
    final receipts = <String>[];
    try {
      for (final b in _shots) {
        if (b.proofPaymentId == null) continue;
        final r = await sl<ApiClient>().updateInvoicePayment(
            b.proofPaymentId!, {'status': approve ? 'approved' : 'rejected', 'notes': notes});
        final code = r.statusCode ?? 0;
        if (code < 200 || code >= 300) {
          throw Exception(r.data is Map ? (r.data['message'] ?? 'Could not save.') : 'Could not save.');
        }
        if (r.data is Map && r.data['receipt_number'] != null) receipts.add('${r.data['receipt_number']}');
      }
      final total = _waiting.fold<double>(0, (t, b) => t + b.amount);
      setState(() {
        _busy = false;
        _done = approve
            ? '${FeeFormat.rupees(total)} marked paid${receipts.isEmpty ? '' : ' — receipt ${receipts.join(', ')}'}.'
            : 'Screenshot not accepted. The family has been told why.';
      });
    } catch (e) {
      setState(() { _busy = false; _error = '$e'.replaceFirst('Exception: ', ''); });
    }
  }

  Future<String?> _askReason() async {
    final c = TextEditingController(text: 'Payment not found in the bank account');
    final ok = await showDialog<bool>(
      context: context,
      builder: (d) => AlertDialog(
        title: const Text('Why is it not accepted?'),
        content: TextField(controller: c, maxLines: 2, decoration: const InputDecoration(helperText: 'The family will see this.')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(d, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(d, true), child: const Text('Reject')),
        ],
      ),
    );
    return ok == true ? c.text.trim() : null;
  }

  void _zoom(String url) => showDialog<void>(
        context: context,
        builder: (d) => GestureDetector(
          onTap: () => Navigator.pop(d),
          child: InteractiveViewer(child: Image.network(url, fit: BoxFit.contain)),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final row = widget.row;
    final total = _waiting.fold<double>(0, (t, b) => t + b.amount);
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 16 + MediaQuery.paddingOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Payment screenshot', style: AppTextStyles.h3),
            Text('${row.name}${row.parentName != null ? ' · Parent: ${row.parentName}' : ''}',
                style: AppTextStyles.caption),
            const SizedBox(height: 12),
            if (_done != null) ...[
              Icon(Icons.check_circle, color: AppColors.success, size: 48),
              const SizedBox(height: 8),
              Text(_done!, textAlign: TextAlign.center, style: AppTextStyles.bodyMedium),
              const SizedBox(height: 16),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Done')),
            ] else ...[
              if (_shots.isEmpty)
                Text('No screenshot is waiting for this student.', style: AppTextStyles.bodyMedium),
              for (final b in _shots) ...[
                if (b.proofUrl != null)
                  GestureDetector(
                    onTap: () => _zoom(absoluteMediaUrl(b.proofUrl)!),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        absoluteMediaUrl(b.proofUrl)!,
                        height: 260,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const SizedBox(
                            height: 80, child: Center(child: Text('Could not load the screenshot'))),
                      ),
                    ),
                  ),
                const SizedBox(height: 8),
                for (final x in _waiting.where((x) => (x.proofUrl ?? 'p${x.proofPaymentId}') == (b.proofUrl ?? 'p${b.proofPaymentId}')))
                  Text('${x.courseName} · ${FeeFormat.rupees(x.amount)}  (bill ${x.id})', style: AppTextStyles.bodyMedium),
                if (b.proofTxn != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('UTR / reference: ${b.proofTxn}', style: AppTextStyles.caption),
                  ),
                const SizedBox(height: 12),
              ],
              Text('If it also paid a brother\'s or sister\'s bill, those are approved together.',
                  style: AppTextStyles.caption),
              const SizedBox(height: 12),
              Text('Total ${FeeFormat.rupees(total)}', style: AppTextStyles.h4),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(_error!, style: AppTextStyles.caption.copyWith(color: AppColors.error)),
                ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _busy || _shots.isEmpty ? null : () => _decide(false),
                      style: OutlinedButton.styleFrom(foregroundColor: AppColors.error, minimumSize: const Size.fromHeight(48)),
                      child: const Text('Reject'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: FilledButton(
                      onPressed: _busy || _shots.isEmpty ? null : () => _decide(true),
                      style: FilledButton.styleFrom(backgroundColor: AppColors.success, minimumSize: const Size.fromHeight(48)),
                      child: Text(_busy ? 'Saving…' : 'Approve — mark paid'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text('Check the amount reached the bank before approving.',
                  textAlign: TextAlign.center, style: AppTextStyles.caption),
            ],
          ],
        ),
      ),
    );
  }
}
