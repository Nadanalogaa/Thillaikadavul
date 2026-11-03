import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/fee_format.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/receipt_sheet.dart';
import 'extra_bills_tab.dart';

enum _Filter { all, paid, unpaid }

/// One extra bill: each student's part (paid with receipt, or pending /
/// overdue), and "Close bill", which stops orders and withdraws unpaid bills.
class ExtraBillDetailScreen extends StatefulWidget {
  final int chargeId;
  final ExtraBill? initial;
  const ExtraBillDetailScreen({super.key, required this.chargeId, this.initial});

  @override
  State<ExtraBillDetailScreen> createState() => _ExtraBillDetailScreenState();
}

class _ExtraBillDetailScreenState extends State<ExtraBillDetailScreen> {
  final _api = sl<ApiClient>();
  ExtraBill? _charge;
  List<Map<String, dynamic>> _bills = [];
  bool _loading = true;
  bool _closing = false;
  String? _error;
  _Filter _filter = _Filter.all;

  @override
  void initState() {
    super.initState();
    _charge = widget.initial;
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await _api.getFeeCharge(widget.chargeId);
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is Map) {
        final d = r.data as Map;
        setState(() {
          _error = null;
          if (d['charge'] is Map) _charge = ExtraBill(Map<String, dynamic>.from(d['charge'] as Map));
          _bills = ((d['bills'] as List?) ?? const [])
              .whereType<Map>()
              .map((m) => Map<String, dynamic>.from(m))
              .toList();
        });
      } else {
        setState(() => _error = (r.data is Map ? r.data['message'] : null) ?? 'Could not load this bill.');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load this bill.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String msg, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.error : AppColors.success,
    ));
  }

  bool _isPaid(Map<String, dynamic> b) => '${b['status']}'.toLowerCase() == 'paid';

  Future<void> _close() async {
    final c = _charge;
    if (c == null) return;
    final unpaid = _bills.where((b) => !_isPaid(b)).length;
    final ok = await ConfirmDialog.show(
      context,
      title: 'Close "${c.title}"?',
      message: [
        if (c.orderable) 'Families will no longer be able to order it.',
        unpaid == 0
            ? 'There are no unpaid bills to withdraw.'
            : 'The $unpaid unpaid ${unpaid == 1 ? 'bill' : 'bills'} will be withdrawn from the families\' Fees.',
        'Paid bills and their receipts stay.',
      ].join(' '),
      confirmLabel: 'Close bill',
      confirmColor: AppColors.error,
    );
    if (ok != true || !mounted) return;
    setState(() => _closing = true);
    try {
      final r = await _api.closeFeeCharge(c.id);
      if (!mounted) return;
      if (r.statusCode == 200) {
        final n = r.data is Map ? (r.data['withdrawn'] as num?)?.toInt() ?? 0 : 0;
        _snack(n == 0 ? 'Bill closed.' : 'Bill closed — $n unpaid ${n == 1 ? 'bill' : 'bills'} withdrawn.');
        await _load();
      } else {
        _snack('${(r.data is Map ? r.data['message'] : null) ?? 'Could not close the bill.'}', error: true);
      }
    } catch (_) {
      if (mounted) _snack('Could not close the bill.', error: true);
    } finally {
      if (mounted) setState(() => _closing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _charge;
    return Scaffold(
      appBar: AppBar(
        title: Text(c?.title ?? 'Extra bill', maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: _loading && c == null
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  if (c != null) _header(c),
                  const SizedBox(height: 12),
                  _filters(),
                  const SizedBox(height: 8),
                  ..._list(),
                ],
              ),
            ),
    );
  }

  Widget _header(ExtraBill c) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              BillChip(c.category, color: categoryColor(c.category)),
              BillChip(c.orderable ? 'Order item' : 'Billed',
                  color: c.orderable ? AppColors.info : AppColors.success),
              if (c.closed) const BillChip('Closed', color: AppColors.textSecondary, icon: Icons.lock_outline),
            ],
          ),
          const SizedBox(height: 8),
          Text(FeeFormat.priceRange(c.amount, c.options),
              style: AppTextStyles.h3.copyWith(color: AppColors.primary, fontWeight: FontWeight.w700)),
          Text(
            [
              c.orderable ? 'per item' : 'per student',
              if (c.dueDate != null) 'due ${FeeFormat.date(c.dueDate)}',
            ].join(' · '),
            style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 6),
          Text('For: ${c.audienceLabel}', style: AppTextStyles.bodySmall),
          if (c.orderable && c.options.isNotEmpty)
            Text('Options: ${c.optionsLabel}', style: AppTextStyles.bodySmall),
          if (c.description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(c.description, style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
          ],
          const Divider(height: 20),
          Row(
            children: [
              Expanded(child: _stat('Paid', '${c.paid} of ${c.bills}', AppColors.success)),
              Expanded(child: _stat('Collected', FeeFormat.rupees(c.paidAmount), AppColors.success)),
              Expanded(child: _stat('Due', FeeFormat.rupees(c.dueAmount), AppColors.warning)),
            ],
          ),
          if (!c.closed) ...[
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _closing ? null : _close,
              icon: _closing
                  ? const SizedBox(
                      width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.lock_outline, size: 18),
              label: Text(c.orderable ? 'Close bill (stop orders)' : 'Close bill'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: BorderSide(color: AppColors.error.withValues(alpha: 0.5)),
                minimumSize: const Size.fromHeight(42),
              ),
            ),
          ] else
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Closed — unpaid bills were withdrawn; paid ones stay.',
                  style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
            ),
          if (c.createdBy.isNotEmpty || c.createdAt != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Created${c.createdBy.isNotEmpty ? ' by ${c.createdBy}' : ''}'
                '${c.createdAt != null ? ' · ${FeeFormat.dateTimeIst(c.createdAt)}' : ''}',
                style: AppTextStyles.caption.copyWith(color: AppColors.textHint),
              ),
            ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(value, style: AppTextStyles.labelLarge.copyWith(color: color)),
        ),
      ],
    );
  }

  Widget _filters() {
    final paid = _bills.where(_isPaid).length;
    final counts = {
      _Filter.all: _bills.length,
      _Filter.paid: paid,
      _Filter.unpaid: _bills.length - paid,
    };
    const labels = {_Filter.all: 'All', _Filter.paid: 'Paid', _Filter.unpaid: 'Unpaid'};
    return Wrap(
      spacing: 8,
      children: [
        for (final f in _Filter.values)
          ChoiceChip(
            label: Text('${labels[f]} (${counts[f]})'),
            selected: _filter == f,
            onSelected: (_) => setState(() => _filter = f),
          ),
      ],
    );
  }

  List<Widget> _list() {
    if (_error != null) {
      return [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Column(
            children: [
              Text(_error!, textAlign: TextAlign.center, style: AppTextStyles.bodyMedium),
              TextButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        ),
      ];
    }
    final shown = _bills.where((b) {
      switch (_filter) {
        case _Filter.all:
          return true;
        case _Filter.paid:
          return _isPaid(b);
        case _Filter.unpaid:
          return !_isPaid(b);
      }
    }).toList();
    if (shown.isEmpty) {
      final c = _charge;
      return [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 32),
          child: Text(
            _bills.isEmpty
                ? (c?.orderable == true ? 'No orders yet.' : 'No bills.')
                : _filter == _Filter.paid
                    ? 'Nobody has paid yet.'
                    : 'Nothing unpaid.',
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
          ),
        ),
      ];
    }
    return [for (final b in shown) _row(b)];
  }

  Widget _row(Map<String, dynamic> b) {
    final name = '${b['student_name'] ?? 'Student'}';
    final parent = '${b['parent_name'] ?? ''}'.trim();
    final phone = '${b['phone'] ?? ''}'.trim();
    final userId = '${b['user_id'] ?? ''}'.trim();
    final amount = (b['amount'] as num?)?.toDouble() ?? 0;
    final status = '${b['status'] ?? 'pending'}'.toLowerCase();
    final paid = status == 'paid';
    final option = '${b['charge_option'] ?? ''}'.trim();
    final qty = (b['quantity'] as num?)?.toInt() ?? 1;
    final receipt = '${b['receipt_number'] ?? ''}'.trim();
    final method = FeeFormat.method(b['payment_method'] == null ? null : '${b['payment_method']}');
    final statusColor = paid
        ? AppColors.success
        : status == 'overdue'
            ? AppColors.error
            : AppColors.warning;
    final item = [
      if (option.isNotEmpty) option,
      if (qty > 1) '× $qty',
    ].join(' ');
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: AppTextStyles.labelLarge, maxLines: 1, overflow: TextOverflow.ellipsis),
                      if ([parent, phone, userId].any((s) => s.isNotEmpty))
                        Text(
                          [
                            if (parent.isNotEmpty) 'Parent: $parent',
                            if (phone.isNotEmpty) phone,
                            if (userId.isNotEmpty) userId,
                          ].join(' · '),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                        ),
                      if (item.isNotEmpty)
                        Text(item, style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(FeeFormat.rupees(amount), style: AppTextStyles.labelLarge),
                    const SizedBox(height: 2),
                    BillChip(status[0].toUpperCase() + status.substring(1), color: statusColor),
                  ],
                ),
              ],
            ),
            if (paid && receipt.isNotEmpty)
              InkWell(
                onTap: () => showReceiptSheet(context, receipt),
                borderRadius: BorderRadius.circular(6),
                child: Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Row(
                    children: [
                      const Icon(Icons.receipt_long, size: 14, color: AppColors.success),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          [
                            'Receipt $receipt',
                            if (method.isNotEmpty) method,
                            if (b['paid_at'] != null) FeeFormat.shortDateTimeIst('${b['paid_at']}'),
                          ].join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.caption
                              .copyWith(color: AppColors.primary, fontWeight: FontWeight.w500),
                        ),
                      ),
                      const Icon(Icons.chevron_right, size: 16, color: AppColors.primary),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
