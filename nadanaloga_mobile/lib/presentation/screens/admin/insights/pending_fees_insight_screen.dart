import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/utils/fee_format.dart';
import 'insights_data.dart';

/// Every student with an unpaid bill (any month), most overdue first, with
/// a call button so the office can follow up.
class PendingFeesInsightScreen extends StatefulWidget {
  const PendingFeesInsightScreen({super.key});

  @override
  State<PendingFeesInsightScreen> createState() =>
      _PendingFeesInsightScreenState();
}

class _PendingFeesInsightScreenState extends State<PendingFeesInsightScreen> {
  final _search = TextEditingController();
  FeeInsights? _data;
  String? _error;
  bool _loading = true;
  bool _overdueOnly = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final d = await AdminInsights.load();
      if (!mounted) return;
      setState(() {
        _data = d.fees;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pending fees'),
        bottom: _loading && _data != null
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2),
              )
            : null,
      ),
      body: _body(),
    );
  }

  Widget _body() {
    final d = _data;
    if (d == null) {
      if (_loading) return const Center(child: CircularProgressIndicator());
      return InsightError(message: _error ?? 'Could not load.', onRetry: _load);
    }
    final q = _search.text;
    final rows = d.students
        .where((r) => !_overdueOnly || r.overdueAmount > 0)
        .where((r) =>
            insightMatches(q, [r.name, r.parentName, r.phone, r.userId]))
        .toList();
    final overdueCount = d.students.where((r) => r.overdueAmount > 0).length;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          _summary(d),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => context.push('/admin/fees'),
              icon: const Icon(Icons.open_in_new, size: 18),
              label: const Text('Open Fees screen'),
            ),
          ),
          const SizedBox(height: 12),
          InsightSearchField(
            controller: _search,
            hint: 'Search name, parent or phone',
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: Text('All (${d.students.length})'),
                selected: !_overdueOnly,
                onSelected: (_) => setState(() => _overdueOnly = false),
              ),
              ChoiceChip(
                label: Text('Overdue ($overdueCount)'),
                selected: _overdueOnly,
                onSelected: (_) => setState(() => _overdueOnly = true),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (rows.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Center(
                child: Text(
                  d.students.isEmpty
                      ? 'No unpaid bills.'
                      : 'No students match.',
                  style: AppTextStyles.bodyMedium
                      .copyWith(color: AppColors.textSecondary),
                ),
              ),
            )
          else
            for (final r in rows) _row(r),
        ],
      ),
    );
  }

  Widget _summary(FeeInsights d) {
    Widget stat(String label, String value, Color color) => Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(value,
                    style: AppTextStyles.labelLarge.copyWith(color: color)),
              ),
              Text(label,
                  style: AppTextStyles.caption,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        );
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.divider),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(d.period, style: AppTextStyles.labelLarge),
            const SizedBox(height: 8),
            Row(
              children: [
                stat('Billed', FeeFormat.rupees(d.billed),
                    AppColors.textPrimary),
                stat('Collected', FeeFormat.rupees(d.collected),
                    AppColors.success),
                stat('Due (${d.dueStudents})', FeeFormat.rupees(d.due),
                    AppColors.warning),
              ],
            ),
            if (d.overdue > 0 || d.verifyingBills > 0 || d.olderDue > 0) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  if (d.overdue > 0)
                    InsightChip(
                        'Overdue ${FeeFormat.rupees(d.overdue)} · ${d.overdueStudents}',
                        color: AppColors.error,
                        icon: Icons.warning_amber_rounded),
                  if (d.verifyingBills > 0)
                    InsightChip('Screenshots to check: ${d.verifyingBills}',
                        color: AppColors.info, icon: Icons.image_outlined),
                  if (d.olderDue > 0)
                    InsightChip(
                        'Older bills ${FeeFormat.rupees(d.olderDue)} (${d.olderBills})',
                        color: AppColors.warning,
                        icon: Icons.history),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _row(FeeInsightRow r) {
    final overdue = r.overdueAmount > 0;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
            color: overdue
                ? AppColors.error.withValues(alpha: 0.3)
                : AppColors.divider),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
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
                      Text(r.name,
                          style: AppTextStyles.labelLarge,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                      if (r.parentName != null)
                        Text('Parent: ${r.parentName}',
                            style: AppTextStyles.caption,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(FeeFormat.rupees(r.amount),
                        style: AppTextStyles.labelLarge.copyWith(
                            color: overdue
                                ? AppColors.error
                                : AppColors.textPrimary)),
                    Text('${r.bills} ${r.bills == 1 ? 'bill' : 'bills'}',
                        style: AppTextStyles.caption),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Flexible(child: PhoneLink(r.phone)),
                const SizedBox(width: 8),
                Expanded(
                  child: Wrap(
                    alignment: WrapAlignment.end,
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      if (overdue)
                        InsightChip(
                            'Overdue ${FeeFormat.rupees(r.overdueAmount)}',
                            color: AppColors.error),
                      if (r.verifying > 0)
                        InsightChip(
                            'Being verified ${FeeFormat.rupees(r.verifying)}',
                            color: AppColors.info),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
