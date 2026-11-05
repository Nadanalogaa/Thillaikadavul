import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/admin_role.dart';
import '../../../../core/utils/fee_format.dart';
import '../../../../core/utils/media_url.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/confirm_dialog.dart';
import '../insights/dashboard_widgets.dart';
import 'expense_data.dart';
import 'expense_form_screen.dart';

/// One expense with everything entered for it. Edit for any admin; delete only
/// for the super admin. Pops `true` when it was changed or deleted.
class ExpenseDetailScreen extends StatefulWidget {
  final ExpenseRow expense;
  final ExpenseMeta meta;
  const ExpenseDetailScreen({super.key, required this.expense, required this.meta});

  @override
  State<ExpenseDetailScreen> createState() => _ExpenseDetailScreenState();
}

class _ExpenseDetailScreenState extends State<ExpenseDetailScreen> {
  bool _deleting = false;

  ExpenseRow get e => widget.expense;

  Future<void> _edit() async {
    final saved = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => ExpenseFormScreen(meta: widget.meta, existing: e),
    ));
    if (saved == true && mounted) Navigator.of(context).pop(true);
  }

  Future<void> _delete() async {
    final ok = await ConfirmDialog.show(
      context,
      title: 'Delete expense?',
      message: 'Delete "${e.particulars}" (${FeeFormat.rupees(e.amount)})? '
          'It will no longer count in the totals.',
      confirmLabel: 'Delete',
      confirmColor: AppColors.error,
    );
    if (ok != true || !mounted) return;
    setState(() => _deleting = true);
    try {
      final r = await sl<ApiClient>().dio.delete(ApiEndpoints.expenseById(e.id));
      if (!mounted) return;
      if (r.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Expense deleted.')));
        Navigator.of(context).pop(true);
        return;
      }
      showErrorSnack(context, serverMessage(r, 'Could not delete the expense.'));
    } catch (_) {
      if (mounted) showErrorSnack(context, 'Connection error. Please try again.');
    }
    if (mounted) setState(() => _deleting = false);
  }

  Future<void> _openReference() async {
    final url = absoluteMediaUrl(e.referenceUrl);
    if (url == null) return;
    final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    if (!ok && mounted) showErrorSnack(context, 'Could not open the document.');
  }

  @override
  Widget build(BuildContext context) {
    final canDelete = isSuperAdminOf(context);
    final color = expenseColor(e.category);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Expense'),
        actions: [
          IconButton(tooltip: 'Edit', icon: const Icon(Icons.edit_outlined), onPressed: _edit),
          if (canDelete)
            IconButton(
              tooltip: 'Delete',
              icon: _deleting
                  ? const SizedBox(
                      width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.delete_outline, color: AppColors.error),
              onPressed: _deleting ? null : _delete,
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          DashPanel(
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(expenseIcon(e.category), color: color),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(e.particulars, style: AppTextStyles.h4),
                      Text(e.category, style: AppTextStyles.caption),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(FeeFormat.rupees(e.amount),
                    style: AppTextStyles.h3.copyWith(color: AppColors.error)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          DashPanel(
            child: Column(
              children: [
                _row('Date', ExpenseDates.dayHeading(e.date)),
                if (e.forMonth != null) _row('For month', ExpenseDates.monthLabel(e.forMonth)),
                _row('Paid to', e.paidTo),
                if (e.teacherName != null) _row('Teacher', e.teacherName),
                _row('Paid by', e.paymentMode),
                _row('Branch', e.locationName),
                _row('Bill / ref. no.', e.referenceNo),
                if (e.notes != null) _row('Notes', e.notes),
              ],
            ),
          ),
          if (e.referenceUrl != null) ...[
            const SizedBox(height: 12),
            DashPanel(
              onTap: _openReference,
              child: Row(
                children: [
                  Icon(
                    (e.referenceName ?? e.referenceUrl!).toLowerCase().endsWith('.pdf')
                        ? Icons.picture_as_pdf_outlined
                        : Icons.image_outlined,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(e.referenceName ?? 'Attached document',
                            style: AppTextStyles.bodySmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        const Text('Tap to open', style: AppTextStyles.caption),
                      ],
                    ),
                  ),
                  const Icon(Icons.open_in_new, size: 18, color: AppColors.textSecondary),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          if (e.createdByName != null || e.createdAt != null)
            Text(
              'Added${e.createdByName != null ? ' by ${e.createdByName}' : ''}'
              '${e.createdAt != null ? ' · ${FeeFormat.dateTimeIst(e.createdAt)}' : ''}',
              style: AppTextStyles.caption,
            ),
          if (e.updatedAt != null || e.updatedByName != null)
            Text(
              'Edited${e.updatedByName != null ? ' by ${e.updatedByName}' : ''}'
              '${e.updatedAt != null ? ' · ${FeeFormat.dateTimeIst(e.updatedAt)}' : ''}',
              style: AppTextStyles.caption,
            ),
        ],
      ),
    );
  }

  Widget _row(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: AppTextStyles.caption),
          ),
          Expanded(
            child: Text(
              (value == null || value.isEmpty) ? '—' : value,
              style: AppTextStyles.bodySmall.copyWith(
                color: value == null ? AppColors.textHint : AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
