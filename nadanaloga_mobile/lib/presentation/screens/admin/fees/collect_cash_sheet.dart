import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/fee_format.dart';
import '../../../../data/models/fee_roster_model.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/receipt_sheet.dart';

/// Collect cash at the office for a student's family. Every unpaid family bill
/// is pre-ticked, so it is two taps: open → "Collect ₹… in cash". Cash is full
/// payment only — there is no amount field. Resolves to true when anything
/// changed (money collected, or a bill turned out to be already paid), so the
/// caller can refresh.
Future<bool> showCollectCashSheet(
  BuildContext context, {
  required int studentId,
  required String studentName,
}) async {
  var changed = false;
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => CollectCashSheet(
      studentId: studentId,
      studentName: studentName,
      onChanged: () => changed = true,
    ),
  );
  return changed;
}

class CollectCashSheet extends StatefulWidget {
  final int studentId;
  final String studentName;
  final VoidCallback? onChanged;

  const CollectCashSheet({
    super.key,
    required this.studentId,
    required this.studentName,
    this.onChanged,
  });

  @override
  State<CollectCashSheet> createState() => _CollectCashSheetState();
}

class _CollectCashSheetState extends State<CollectCashSheet> {
  final _api = sl<ApiClient>();
  FamilyDue? _due;
  final Set<int> _checked = {};
  bool _loading = true;
  String? _loadError;
  bool _submitting = false;
  String? _submitError;
  Map<String, dynamic>? _result; // collect-cash success payload

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool quiet = false}) async {
    if (!quiet) {
      setState(() {
        _loading = true;
        _loadError = null;
      });
    }
    try {
      final r = await _api.getFamilyDue(widget.studentId);
      if (!mounted) return;
      final code = r.statusCode ?? 0;
      if (code >= 200 && code < 300 && r.data is Map) {
        final due =
            FamilyDue.fromJson(Map<String, dynamic>.from(r.data as Map));
        setState(() {
          _due = due;
          _checked
            ..clear()
            ..addAll(due.bills.map((b) => b.id));
        });
      } else if (!quiet) {
        setState(() =>
            _loadError = feeErrorMessage(r.data, 'Could not load the dues.'));
      }
    } on DioException catch (_) {
      if (mounted && !quiet) {
        setState(() => _loadError = 'Network error. Check the connection.');
      }
    } catch (_) {
      if (mounted && !quiet) {
        setState(() => _loadError = 'Could not load the dues.');
      }
    } finally {
      if (mounted && !quiet) setState(() => _loading = false);
    }
  }

  double get _total => (_due?.bills ?? const <FamilyDueBill>[])
      .where((b) => _checked.contains(b.id))
      .fold(0.0, (t, b) => t + b.amount);

  Future<void> _collect() async {
    if (_checked.isEmpty || _submitting) return;
    setState(() {
      _submitting = true;
      _submitError = null;
    });
    try {
      final r = await _api.collectCash(_checked.toList());
      if (!mounted) return;
      final code = r.statusCode ?? 0;
      if (code >= 200 && code < 300 && r.data is Map) {
        widget.onChanged?.call();
        setState(() => _result = Map<String, dynamic>.from(r.data as Map));
      } else {
        setState(() => _submitError =
            feeErrorMessage(r.data, 'Could not record the cash payment.'));
        if (code == 409) {
          // Someone else already settled a bill — show fresh dues.
          widget.onChanged?.call();
          await _load(quiet: true);
        }
      }
    } on DioException catch (_) {
      if (mounted) {
        setState(() => _submitError =
            'Network error. Check the connection, then try again.');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _submitError = 'Could not record the cash payment.');
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final maxHeight = MediaQuery.sizeOf(context).height * 0.88;
    Widget child;
    if (_result != null) {
      child = _success(_result!);
    } else if (_loading) {
      child = const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: Center(child: CircularProgressIndicator()),
      );
    } else if (_due == null) {
      child = _message(
        icon: Icons.error_outline,
        text: _loadError ?? 'Could not load the dues.',
        action: OutlinedButton(onPressed: _load, child: const Text('Retry')),
      );
    } else {
      child = _form(_due!);
    }
    return PopScope(
      canPop: !_submitting,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight),
        child: child,
      ),
    );
  }

  Widget _header(String title, {String? subtitle}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600)),
          if (subtitle != null) Text(subtitle, style: AppTextStyles.caption),
        ],
      ),
    );
  }

  Widget _message({
    required IconData icon,
    required String text,
    Widget? action,
    Color color = AppColors.textSecondary,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 44, color: color),
          const SizedBox(height: 12),
          Text(text,
              textAlign: TextAlign.center, style: AppTextStyles.bodyMedium),
          if (action != null) ...[const SizedBox(height: 16), action],
        ],
      ),
    );
  }

  Widget _form(FamilyDue due) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    if (due.bills.isEmpty) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _header('Collect cash', subtitle: widget.studentName),
          if (_submitError != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _errorText(_submitError!),
            ),
          _message(
            icon: Icons.check_circle_outline,
            color: AppColors.success,
            text: 'Nothing to collect — every bill for this family is paid.',
            action: FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ),
        ],
      );
    }
    final total = _total;
    final email = due.notifyEmail;
    final caption = email != null
        ? 'Receipt will be emailed to ${due.notifyName ?? 'the family'} ($email)'
        : 'No email on file — the family gets an app notification.';
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _header(
          'Collect cash',
          subtitle:
              '${widget.studentName}\'s family · ${due.bills.length} unpaid ${due.bills.length == 1 ? 'bill' : 'bills'}',
        ),
        Flexible(
          child: ListView(
            shrinkWrap: true,
            padding: EdgeInsets.zero,
            children: [
              for (final b in due.bills)
                CheckboxListTile(
                  value: _checked.contains(b.id),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                  onChanged: _submitting
                      ? null
                      : (v) => setState(() {
                            if (v == true) {
                              _checked.add(b.id);
                            } else {
                              _checked.remove(b.id);
                            }
                            _submitError = null;
                          }),
                  title: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child:
                            Text(b.courseName, style: AppTextStyles.labelLarge),
                      ),
                      const SizedBox(width: 8),
                      Text(FeeFormat.rupees(b.amount),
                          style: AppTextStyles.labelLarge
                              .copyWith(fontWeight: FontWeight.w600)),
                    ],
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          [b.studentName, b.billingPeriod]
                              .whereType<String>()
                              .join(' · '),
                          style: AppTextStyles.caption,
                        ),
                        if (b.overdue)
                          const _MiniChip(
                              label: 'Overdue', color: AppColors.error),
                        if (b.proratedFrom != null)
                          const _MiniChip(
                              label: 'Pro-rata', color: AppColors.info),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
        const Divider(height: 1),
        Padding(
          padding: EdgeInsets.fromLTRB(20, 12, 20, 16 + bottomInset),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Text('Total cash',
                        style: AppTextStyles.bodyMedium
                            .copyWith(color: AppColors.textSecondary)),
                  ),
                  Text(FeeFormat.rupees(total),
                      style: AppTextStyles.h2.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700)),
                ],
              ),
              const SizedBox(height: 4),
              Text(caption, style: AppTextStyles.caption),
              if (_submitError != null) _errorText(_submitError!),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _checked.isEmpty || _submitting ? null : _collect,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  backgroundColor: AppColors.success,
                  textStyle: AppTextStyles.button.copyWith(fontSize: 16),
                ),
                icon: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.payments_outlined),
                label: Text(_checked.isEmpty
                    ? 'Select a bill to collect'
                    : 'Collect ${FeeFormat.rupees(total)} in cash'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _errorText(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.error.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(text,
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.error)),
      ),
    );
  }

  Widget _success(Map<String, dynamic> data) {
    final receiptNo = '${data['receipt_number'] ?? ''}';
    final total = data['total'] is num
        ? (data['total'] as num).toDouble()
        : double.tryParse('${data['total']}') ?? 0;
    final lines = FeeReceiptLine.listFrom(data['lines']);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 16 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.check_circle, size: 72, color: AppColors.success),
          const SizedBox(height: 8),
          Text('Cash collected',
              textAlign: TextAlign.center,
              style: AppTextStyles.bodyMedium
                  .copyWith(color: AppColors.textSecondary)),
          Text(FeeFormat.rupees(total),
              textAlign: TextAlign.center,
              style: AppTextStyles.h1.copyWith(color: AppColors.success)),
          const SizedBox(height: 4),
          Text('Receipt $receiptNo',
              textAlign: TextAlign.center,
              style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600)),
          if (data['paid_at'] != null)
            Text(
              [
                FeeFormat.dateTimeIst('${data['paid_at']}'),
                if (data['collected_by_name'] != null)
                  'by ${data['collected_by_name']}',
              ].join(' '),
              textAlign: TextAlign.center,
              style: AppTextStyles.caption,
            ),
          const SizedBox(height: 16),
          const Divider(height: 1),
          for (final l in lines)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l.courseName, style: AppTextStyles.bodyMedium),
                        Text(
                          [l.studentName, l.billingPeriod]
                              .whereType<String>()
                              .join(' · '),
                          style: AppTextStyles.caption,
                        ),
                      ],
                    ),
                  ),
                  Text(FeeFormat.rupees(l.amount),
                      style: AppTextStyles.labelLarge),
                ],
              ),
            ),
          const Divider(height: 1),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48)),
                  onPressed: receiptNo.isEmpty
                      ? null
                      : () async {
                          final reversed = await showReceiptSheet(
                              context, receiptNo,
                              canReverse: true);
                          if (reversed) widget.onChanged?.call();
                        },
                  child: const Text('View receipt'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48)),
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Done'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniChip extends StatelessWidget {
  final String label;
  final Color color;

  const _MiniChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption
            .copyWith(color: color, fontSize: 10, fontWeight: FontWeight.w600),
      ),
    );
  }
}
