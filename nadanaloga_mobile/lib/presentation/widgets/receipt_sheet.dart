import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../config/theme/app_colors.dart';
import '../../config/theme/app_text_styles.dart';
import '../../core/network/api_client.dart';
import '../../core/utils/fee_format.dart';
import '../../data/models/fee_roster_model.dart';
import '../../di/injection_container.dart';

/// Open a fee receipt in a bottom sheet. Used by the admin (with
/// [canReverse]) and by parents (read-only). Resolves to true when the receipt
/// was reversed while open, so the caller can refresh.
Future<bool> showReceiptSheet(
  BuildContext context,
  String receiptNumber, {
  bool canReverse = false,
}) async {
  var reversed = false;
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => ReceiptSheet(
      receiptNumber: receiptNumber,
      canReverse: canReverse,
      onReversed: () => reversed = true,
    ),
  );
  return reversed;
}

class ReceiptSheet extends StatefulWidget {
  final String receiptNumber;
  final bool canReverse;
  final VoidCallback? onReversed;

  const ReceiptSheet({
    super.key,
    required this.receiptNumber,
    this.canReverse = false,
    this.onReversed,
  });

  @override
  State<ReceiptSheet> createState() => _ReceiptSheetState();
}

class _ReceiptSheetState extends State<ReceiptSheet> {
  final _api = sl<ApiClient>();
  FeeReceipt? _receipt;
  bool _loading = true;
  String? _error;
  bool _reversing = false;
  String? _reverseError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _receipt == null;
      _error = null;
    });
    try {
      final r = await _api.getReceipt(widget.receiptNumber);
      if (!mounted) return;
      final code = r.statusCode ?? 0;
      if (code >= 200 && code < 300 && r.data is Map) {
        setState(() => _receipt =
            FeeReceipt.fromJson(Map<String, dynamic>.from(r.data as Map)));
      } else {
        setState(() =>
            _error = feeErrorMessage(r.data, 'Could not load the receipt.'));
      }
    } on DioException catch (_) {
      if (mounted) {
        setState(() => _error = 'Network error. Check the connection.');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load the receipt.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _reverse() async {
    final receipt = _receipt;
    if (receipt == null) return;
    final reason = await showDialog<String>(
      context: context,
      builder: (_) => _ReverseReasonDialog(total: receipt.total),
    );
    if (reason == null || reason.trim().isEmpty || !mounted) return;
    setState(() {
      _reversing = true;
      _reverseError = null;
    });
    try {
      final r = await _api.reverseReceipt(receipt.receiptNumber, reason.trim());
      if (!mounted) return;
      final code = r.statusCode ?? 0;
      if (code >= 200 && code < 300) {
        widget.onReversed?.call();
        await _load();
      } else {
        if (code == 409) widget.onReversed?.call();
        setState(() => _reverseError =
            feeErrorMessage(r.data, 'Could not reverse this receipt.'));
        if (code == 409) await _load();
      }
    } on DioException catch (_) {
      if (mounted) {
        setState(() => _reverseError = 'Network error. Nothing was changed.');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _reverseError = 'Could not reverse this receipt.');
      }
    } finally {
      if (mounted) setState(() => _reversing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final maxHeight = MediaQuery.sizeOf(context).height * 0.85;
    Widget body;
    if (_loading) {
      body = const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: Center(child: CircularProgressIndicator()),
      );
    } else if (_receipt == null) {
      body = Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline,
                size: 40, color: AppColors.textSecondary),
            const SizedBox(height: 12),
            Text(_error ?? 'Could not load the receipt.',
                textAlign: TextAlign.center, style: AppTextStyles.bodyMedium),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      );
    } else {
      body = _content(_receipt!);
    }
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: maxHeight),
      child: body,
    );
  }

  Widget _content(FeeReceipt r) {
    final statusColor = r.isReversed ? AppColors.error : AppColors.success;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Receipt',
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textSecondary)),
                    SelectableText(r.receiptNumber,
                        style: AppTextStyles.h4
                            .copyWith(fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              _Badge(
                label: r.isReversed ? 'Reversed' : 'Paid',
                color: statusColor,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            FeeFormat.rupees(r.total),
            style: AppTextStyles.h1.copyWith(
              color: r.isReversed ? AppColors.textSecondary : AppColors.primary,
              decoration: r.isReversed ? TextDecoration.lineThrough : null,
            ),
          ),
          const SizedBox(height: 12),
          _infoRow('Method', r.methodLabel ?? FeeFormat.method(r.method)),
          if (r.paidAt != null)
            _infoRow('Paid on', FeeFormat.dateTimeIst(r.paidAt)),
          if (r.collectedByName != null)
            _infoRow('Collected by', r.collectedByName!),
          if (r.transactionId != null)
            _infoRow('Transaction ID', r.transactionId!),
          if (r.isReversed) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border:
                    Border.all(color: AppColors.error.withValues(alpha: 0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.undo, size: 18, color: AppColors.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _reversedText(r),
                      style: AppTextStyles.bodyMedium
                          .copyWith(color: AppColors.error),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 8),
          for (final line in r.lines)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(line.courseName, style: AppTextStyles.bodyMedium),
                        Text(
                          [line.studentName, line.billingPeriod]
                              .whereType<String>()
                              .join(' · '),
                          style: AppTextStyles.caption,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(FeeFormat.rupees(line.amount),
                      style: AppTextStyles.labelLarge),
                ],
              ),
            ),
          const SizedBox(height: 4),
          const Divider(height: 1),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Text('Total',
                    style: AppTextStyles.labelLarge
                        .copyWith(fontWeight: FontWeight.w600)),
              ),
              Text(FeeFormat.rupees(r.total),
                  style: AppTextStyles.labelLarge
                      .copyWith(fontWeight: FontWeight.w700)),
            ],
          ),
          if (_reverseError != null) ...[
            const SizedBox(height: 12),
            Text(_reverseError!,
                style:
                    AppTextStyles.bodyMedium.copyWith(color: AppColors.error)),
          ],
          if (widget.canReverse && !r.isReversed) ...[
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: _reversing ? null : _reverse,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: const BorderSide(color: AppColors.error),
                minimumSize: const Size.fromHeight(48),
              ),
              icon: _reversing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.undo),
              label: const Text('Reverse receipt'),
            ),
          ],
        ],
      ),
    );
  }

  String _reversedText(FeeReceipt r) {
    final parts = StringBuffer('Reversed');
    if (r.reversedAt != null) {
      parts.write(' on ${FeeFormat.dateTimeIst(r.reversedAt)}');
    }
    if (r.reversedByName != null) parts.write(' by ${r.reversedByName}');
    if (r.reversalReason != null) parts.write(': ${r.reversalReason}');
    return parts.toString();
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: AppTextStyles.caption),
          ),
          Expanded(child: Text(value, style: AppTextStyles.bodyMedium)),
        ],
      ),
    );
  }
}

class _ReverseReasonDialog extends StatefulWidget {
  final double total;

  const _ReverseReasonDialog({required this.total});

  @override
  State<_ReverseReasonDialog> createState() => _ReverseReasonDialogState();
}

class _ReverseReasonDialogState extends State<_ReverseReasonDialog> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ok = _controller.text.trim().isNotEmpty;
    return AlertDialog(
      title: const Text('Reverse receipt?'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
              'The bills on this receipt go back to unpaid. This cannot be undone.'),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            autofocus: true,
            maxLines: 2,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'Reason (required)',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.error),
          onPressed:
              ok ? () => Navigator.pop(context, _controller.text.trim()) : null,
          child: Text('Reverse ${FeeFormat.rupees(widget.total)}'),
        ),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;

  const _Badge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption
            .copyWith(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}
