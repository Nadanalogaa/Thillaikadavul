import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/admin_role.dart';
import '../../../../core/utils/fee_format.dart';
import '../../../../di/injection_container.dart';
import '../expenses/expense_data.dart';
import '../insights/dashboard_widgets.dart';

num _n(dynamic v) => v is num ? v : num.tryParse('${v ?? ''}') ?? 0;

enum _Period { thisMonth, last3, last6, financialYear, custom }

/// Money in (fees collected) against money out (expenses), month by month.
/// Super admin only.
class AccountsScreen extends StatefulWidget {
  const AccountsScreen({super.key});

  @override
  State<AccountsScreen> createState() => _AccountsScreenState();
}

class _AccountsScreenState extends State<AccountsScreen> {
  final _api = sl<ApiClient>();

  _Period _period = _Period.last6;
  DateTime? _customFrom;
  DateTime? _customTo;

  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;

  @override
  void initState() {
    super.initState();
    _load();
  }

  DateTime get _thisMonth {
    final n = FeeFormat.nowIst();
    return DateTime(n.year, n.month);
  }

  (DateTime, DateTime) get _bounds {
    final m = _thisMonth;
    switch (_period) {
      case _Period.thisMonth:
        return (m, m);
      case _Period.last3:
        return (DateTime(m.year, m.month - 2), m);
      case _Period.last6:
        return (DateTime(m.year, m.month - 5), m);
      case _Period.financialYear:
        final startYear = m.month >= 4 ? m.year : m.year - 1;
        return (DateTime(startYear, 4), m);
      case _Period.custom:
        return (_customFrom ?? DateTime(m.year, m.month - 5), _customTo ?? m);
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final (from, to) = _bounds;
    try {
      final r = await _api.dio.get(ApiEndpoints.accountsSummary, queryParameters: {
        'from': ExpenseDates.monthKey(from),
        'to': ExpenseDates.monthKey(to),
      });
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is Map) {
        setState(() {
          _data = Map<String, dynamic>.from(r.data);
          _loading = false;
        });
      } else {
        setState(() {
          _error = serverMessage(r, 'Could not load the accounts.');
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Connection error. Please try again.';
          _loading = false;
        });
      }
    }
  }

  Future<void> _pickCustom() async {
    final now = FeeFormat.nowIst();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(now.year, now.month + 1, 0),
      helpText: 'Choose the months (any day in each)',
      initialDateRange: DateTimeRange(
        start: _customFrom ?? DateTime(now.year, now.month - 5),
        end: _customTo ?? DateTime(now.year, now.month, now.day),
      ),
    );
    if (picked == null) return;
    setState(() {
      _period = _Period.custom;
      _customFrom = DateTime(picked.start.year, picked.start.month);
      _customTo = DateTime(picked.end.year, picked.end.month);
    });
    _load();
  }

  void _setPeriod(_Period p) {
    if (p == _Period.custom) {
      _pickCustom();
      return;
    }
    setState(() => _period = p);
    _load();
  }

  String get _periodLabel {
    final (from, to) = _bounds;
    final a = ExpenseDates.monthLabel(ExpenseDates.monthKey(from));
    final b = ExpenseDates.monthLabel(ExpenseDates.monthKey(to));
    return a == b ? a : '$a – $b';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Accounts'),
        bottom: _loading && _data != null
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2))
            : null,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            _periodChips(),
            const SizedBox(height: 4),
            Text(_periodLabel, style: AppTextStyles.caption),
            const SizedBox(height: 12),
            if (_error != null)
              SizedBox(height: 300, child: RetryPanel(message: _error!, onRetry: _load))
            else if (_data == null)
              const Padding(
                padding: EdgeInsets.only(top: 80),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              ..._content(_data!),
          ],
        ),
      ),
    );
  }

  Widget _periodChips() {
    const labels = {
      _Period.thisMonth: 'This month',
      _Period.last3: 'Last 3 months',
      _Period.last6: 'Last 6 months',
      _Period.financialYear: 'This financial year',
      _Period.custom: 'Custom…',
    };
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (final e in labels.entries)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ChoiceChip(
                label: Text(e.key == _Period.custom && _period == _Period.custom
                    ? 'Custom ✎'
                    : e.value),
                selected: _period == e.key,
                onSelected: (_) => _setPeriod(e.key),
              ),
            ),
        ],
      ),
    );
  }

  List<Widget> _content(Map<String, dynamic> d) {
    final totals = d['totals'] is Map ? Map<String, dynamic>.from(d['totals']) : <String, dynamic>{};
    final outstanding =
        d['outstanding'] is Map ? Map<String, dynamic>.from(d['outstanding']) : <String, dynamic>{};
    final months = (d['months'] is List ? d['months'] as List : const [])
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .toList();
    final byCat = Bucket.list(d['expenses_by_category']);
    final byKind = Bucket.list(d['income_by_kind']);
    final byMethod = Bucket.list(d['income_by_method']);
    final byLoc = (d['by_location'] is List ? d['by_location'] as List : const [])
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .toList();
    final collected = _n(totals['collected']);
    final expenses = _n(totals['expenses']);
    final net = _n(totals['net']);
    final margin = totals['margin'];

    return [
      _kpis([
        _Kpi('Collected', FeeFormat.rupees(collected), Icons.south_west, AppColors.success),
        _Kpi('Expenses', FeeFormat.rupees(expenses), Icons.north_east, AppColors.error),
        _Kpi('Net', FeeFormat.rupees(net), Icons.account_balance_wallet_outlined,
            net >= 0 ? AppColors.success : AppColors.error),
        _Kpi('Margin', margin == null ? '–' : '${_n(margin).round()}%', Icons.percent,
            margin == null ? AppColors.textSecondary : (_n(margin) >= 0 ? AppColors.success : AppColors.error)),
        _Kpi(
          'Outstanding',
          FeeFormat.rupees(_n(outstanding['amount'])),
          Icons.hourglass_bottom,
          AppColors.warning,
          sub: '${_n(outstanding['bills']).round()} bills · ${_n(outstanding['students']).round()} students',
        ),
      ]),
      const SizedBox(height: 22),
      const DashSectionTitle('Month by month'),
      _monthChart(months),
      const SizedBox(height: 22),
      const DashSectionTitle('Expenses by category'),
      _bucketPanel(byCat, empty: 'No expenses in this period.', colorFor: expenseColor, iconFor: expenseIcon),
      const SizedBox(height: 22),
      const DashSectionTitle('Income'),
      DashPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('By kind', style: AppTextStyles.labelSmall),
            const SizedBox(height: 8),
            _bucketRows(byKind, empty: 'No payments in this period.', colorFor: (_) => AppColors.success),
            const Divider(height: 22),
            const Text('By payment method', style: AppTextStyles.labelSmall),
            const SizedBox(height: 8),
            _bucketRows(byMethod, empty: 'No payments in this period.', colorFor: (_) => AppColors.info),
          ],
        ),
      ),
      const SizedBox(height: 22),
      const DashSectionTitle('By branch'),
      _locationTable(byLoc),
    ];
  }

  Widget _kpis(List<_Kpi> items) {
    return LayoutBuilder(builder: (context, c) {
      final w = (c.maxWidth - 10) / 2;
      return Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          for (var i = 0; i < items.length; i++)
            SizedBox(
              // The last tile spans the row when the count is odd.
              width: i == items.length - 1 && items.length.isOdd ? c.maxWidth : w,
              child: DashPanel(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(items[i].icon, size: 16, color: items[i].color),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(items[i].label,
                              style: AppTextStyles.caption,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(items[i].value,
                          style: AppTextStyles.h3.copyWith(color: items[i].color)),
                    ),
                    if (items[i].sub != null)
                      Text(items[i].sub!,
                          style: AppTextStyles.caption,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            ),
        ],
      );
    });
  }

  Widget _monthChart(List<Map<String, dynamic>> months) {
    if (months.isEmpty) {
      return const DashPanel(child: Text('No months in this period.', style: AppTextStyles.bodySmall));
    }
    num maxV = 0;
    for (final m in months) {
      final c = _n(m['collected']);
      final e = _n(m['expenses']);
      if (c > maxV) maxV = c;
      if (e > maxV) maxV = e;
    }
    const chartH = 120.0;
    Widget bar(num v, Color color) => Container(
          width: 10,
          height: maxV == 0 ? 2 : (v / maxV * chartH).clamp(2, chartH).toDouble(),
          decoration: BoxDecoration(
            color: color,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
          ),
        );
    final groups = [
      for (final m in months)
        SizedBox(
          width: 40,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                height: chartH,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    bar(_n(m['collected']), AppColors.success),
                    const SizedBox(width: 3),
                    bar(_n(m['expenses']), AppColors.error),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Text(ExpenseDates.monthShort('${m['month']}'), style: AppTextStyles.caption),
            ],
          ),
        ),
    ];
    return DashPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _legend(AppColors.success, 'Collected'),
              const SizedBox(width: 14),
              _legend(AppColors.error, 'Expenses'),
            ],
          ),
          const SizedBox(height: 12),
          LayoutBuilder(builder: (context, c) {
            final fits = groups.length * 40 <= c.maxWidth;
            final row = Row(
              mainAxisAlignment: fits ? MainAxisAlignment.spaceAround : MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: groups,
            );
            return fits
                ? row
                : SingleChildScrollView(scrollDirection: Axis.horizontal, reverse: true, child: row);
          }),
          const Divider(height: 22),
          const Row(
            children: [
              Expanded(flex: 3, child: Text('Month', style: AppTextStyles.caption)),
              Expanded(flex: 4, child: Text('In', textAlign: TextAlign.right, style: AppTextStyles.caption)),
              Expanded(flex: 4, child: Text('Out', textAlign: TextAlign.right, style: AppTextStyles.caption)),
              Expanded(flex: 4, child: Text('Net', textAlign: TextAlign.right, style: AppTextStyles.caption)),
            ],
          ),
          const SizedBox(height: 4),
          for (final m in months.reversed)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  Expanded(
                      flex: 3,
                      child: Text(ExpenseDates.monthLabel('${m['month']}'), style: AppTextStyles.caption.copyWith(color: AppColors.textPrimary))),
                  _cell(FeeFormat.rupees(_n(m['collected'])), AppColors.textPrimary),
                  _cell(FeeFormat.rupees(_n(m['expenses'])), AppColors.textPrimary),
                  _cell(FeeFormat.rupees(_n(m['net'])),
                      _n(m['net']) >= 0 ? AppColors.success : AppColors.error, bold: true),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _cell(String text, Color color, {bool bold = false}) => Expanded(
        flex: 4,
        child: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerRight,
          child: Text(text,
              style: AppTextStyles.caption.copyWith(
                  color: color, fontWeight: bold ? FontWeight.w600 : FontWeight.w400)),
        ),
      );

  Widget _legend(Color c, String label) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(3))),
          const SizedBox(width: 6),
          Text(label, style: AppTextStyles.caption),
        ],
      );

  Widget _bucketPanel(List<Bucket> list,
      {required String empty, required Color Function(String) colorFor, IconData Function(String)? iconFor}) {
    return DashPanel(child: _bucketRows(list, empty: empty, colorFor: colorFor, iconFor: iconFor));
  }

  Widget _bucketRows(List<Bucket> list,
      {required String empty, required Color Function(String) colorFor, IconData Function(String)? iconFor}) {
    if (list.isEmpty) return Text(empty, style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary));
    final total = list.fold<num>(0, (t, b) => t + b.total);
    final maxV = list.map((b) => b.total).reduce((a, b) => a > b ? a : b);
    return Column(
      children: [
        for (final b in list)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (iconFor != null) ...[
                      Icon(iconFor(b.key), size: 14, color: colorFor(b.key)),
                      const SizedBox(width: 6),
                    ],
                    Expanded(
                      child: Text(b.key,
                          style: AppTextStyles.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                    ),
                    Text(
                      '${FeeFormat.rupees(b.total)}'
                      '${total > 0 ? '  ·  ${(b.total / total * 100).round()}%' : ''}',
                      style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                ExpenseBar(fraction: maxV == 0 ? 0 : b.total / maxV, color: colorFor(b.key)),
              ],
            ),
          ),
      ],
    );
  }

  Widget _locationTable(List<Map<String, dynamic>> rows) {
    if (rows.isEmpty) {
      return const DashPanel(child: Text('Nothing recorded in this period.', style: AppTextStyles.bodySmall));
    }
    return DashPanel(
      child: Column(
        children: [
          const Row(
            children: [
              Expanded(flex: 4, child: Text('Branch', style: AppTextStyles.caption)),
              Expanded(flex: 4, child: Text('In', textAlign: TextAlign.right, style: AppTextStyles.caption)),
              Expanded(flex: 4, child: Text('Out', textAlign: TextAlign.right, style: AppTextStyles.caption)),
              Expanded(flex: 4, child: Text('Net', textAlign: TextAlign.right, style: AppTextStyles.caption)),
            ],
          ),
          const Divider(height: 14),
          for (final r in rows)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                children: [
                  Expanded(
                    flex: 4,
                    child: Text('${r['location'] ?? 'Not set'}',
                        style: AppTextStyles.bodySmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                  ),
                  _cell(FeeFormat.rupees(_n(r['collected'])), AppColors.textPrimary),
                  _cell(FeeFormat.rupees(_n(r['expenses'])), AppColors.textPrimary),
                  _cell(FeeFormat.rupees(_n(r['net'])),
                      _n(r['net']) >= 0 ? AppColors.success : AppColors.error, bold: true),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Kpi {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String? sub;
  const _Kpi(this.label, this.value, this.icon, this.color, {this.sub});
}
