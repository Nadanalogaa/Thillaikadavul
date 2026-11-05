import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/admin_role.dart';
import '../../../../core/utils/fee_format.dart';
import '../../../../di/injection_container.dart';
import '../insights/dashboard_widgets.dart';
import 'expense_data.dart';
import 'expense_detail_screen.dart';
import 'expense_form_screen.dart';

/// Money the academy spends: rent, teacher fees, electricity, supplies…
/// Any admin can add and edit; only the super admin can delete.
class ExpensesScreen extends StatefulWidget {
  /// Open the add form straight away (dashboard quick action).
  final bool startWithAdd;
  const ExpensesScreen({super.key, this.startWithAdd = false});

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  final _api = sl<ApiClient>();
  final _search = TextEditingController();
  Timer? _debounce;

  ExpenseMeta? _meta;
  String? _metaError;

  // Period: a calendar month, or a custom range when [_range] is set.
  late DateTime _month;
  DateTimeRange? _range;
  String? _category;

  bool _loading = true;
  String? _error;
  List<ExpenseRow> _rows = const [];
  num _total = 0;
  int _count = 0;
  List<Bucket> _byCategory = const [];
  List<Bucket> _byMonth = const [];

  @override
  void initState() {
    super.initState();
    final now = FeeFormat.nowIst();
    _month = DateTime(now.year, now.month);
    _loadAll().then((_) {
      if (widget.startWithAdd && mounted && _meta != null) _openForm();
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  DateTime get _from => _range?.start ?? _month;
  DateTime get _to =>
      _range?.end ?? DateTime(_month.year, _month.month + 1, 0);

  Future<void> _loadAll() async {
    await Future.wait([_loadMeta(), _loadRows()]);
  }

  Future<void> _loadMeta() async {
    try {
      final r = await _api.dio.get(ApiEndpoints.expensesMeta);
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is Map) {
        setState(() {
          _meta = ExpenseMeta.fromJson(Map<String, dynamic>.from(r.data));
          _metaError = null;
        });
      } else {
        setState(() => _metaError = serverMessage(r, 'Could not load expense settings.'));
      }
    } catch (_) {
      if (mounted) setState(() => _metaError = 'Connection error. Please try again.');
    }
  }

  Future<void> _loadRows() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final q = <String, dynamic>{
        'from': ExpenseDates.ymd(_from),
        'to': ExpenseDates.ymd(_to),
        if (_category != null) 'category': _category,
        if (_search.text.trim().isNotEmpty) 'q': _search.text.trim(),
      };
      final r = await _api.dio.get(ApiEndpoints.expenses, queryParameters: q);
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is Map) {
        final d = Map<String, dynamic>.from(r.data);
        setState(() {
          _rows = (d['rows'] is List ? d['rows'] as List : const [])
              .whereType<Map>()
              .map((e) => ExpenseRow.fromJson(Map<String, dynamic>.from(e)))
              .toList();
          _total = d['total'] is num ? d['total'] : num.tryParse('${d['total']}') ?? 0;
          _count = d['count'] is int ? d['count'] : _rows.length;
          _byCategory = Bucket.list(d['by_category']);
          _byMonth = Bucket.list(d['by_month']);
          _loading = false;
        });
      } else {
        setState(() {
          _error = serverMessage(r, 'Could not load expenses.');
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

  void _shiftMonth(int by) {
    setState(() {
      _range = null;
      _month = DateTime(_month.year, _month.month + by);
    });
    _loadRows();
  }

  bool get _atThisMonth {
    final now = FeeFormat.nowIst();
    return _range == null && _month.year == now.year && _month.month == now.month;
  }

  Future<void> _pickRange() async {
    final now = FeeFormat.nowIst();
    final today = DateTime(now.year, now.month, now.day);
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: today,
      initialDateRange: DateTimeRange(
        start: _from,
        end: _to.isAfter(today) ? today : _to,
      ),
      helpText: 'Expenses between',
    );
    if (picked == null) return;
    setState(() => _range = picked);
    _loadRows();
  }

  void _onSearch(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), _loadRows);
  }

  Future<void> _openForm({ExpenseRow? edit, DueExpense? prefill}) async {
    if (_meta == null) {
      await _loadMeta();
      if (_meta == null) return;
    }
    if (!mounted) return;
    final saved = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => ExpenseFormScreen(meta: _meta!, existing: edit, prefill: prefill),
    ));
    if (saved == true && mounted) _loadAll();
  }

  Future<void> _openDetail(ExpenseRow row) async {
    if (_meta == null) await _loadMeta();
    if (!mounted || _meta == null) return;
    final changed = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => ExpenseDetailScreen(expense: row, meta: _meta!),
    ));
    if (changed == true && mounted) _loadAll();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Expenses'),
        actions: [
          IconButton(
            tooltip: 'Custom dates',
            icon: const Icon(Icons.date_range_outlined),
            onPressed: _pickRange,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(),
        icon: const Icon(Icons.add),
        label: const Text('Add expense'),
      ),
      body: RefreshIndicator(
        onRefresh: _loadAll,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
          children: [
            _periodBar(),
            const SizedBox(height: 10),
            _searchField(),
            const SizedBox(height: 10),
            _categoryChips(),
            const SizedBox(height: 12),
            if (_metaError != null && _meta == null) ...[
              DashPanel(
                child: Row(children: [
                  const Icon(Icons.error_outline, color: AppColors.error),
                  const SizedBox(width: 10),
                  Expanded(child: Text(_metaError!, style: AppTextStyles.bodySmall)),
                  TextButton(onPressed: _loadMeta, child: const Text('Retry')),
                ]),
              ),
              const SizedBox(height: 12),
            ],
            if (_error != null)
              SizedBox(
                height: 260,
                child: RetryPanel(message: _error!, onRetry: _loadRows),
              )
            else if (_loading && _rows.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 60),
                child: Center(child: CircularProgressIndicator()),
              )
            else ...[
              if (_loading) const LinearProgressIndicator(minHeight: 2),
              _summaryCard(),
              const SizedBox(height: 12),
              if (_meta != null && _meta!.due.isNotEmpty) ...[
                _dueCard(_meta!),
                const SizedBox(height: 12),
              ],
              ..._groupedList(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _periodBar() {
    final label = _range == null
        ? ExpenseDates.monthLong(_month)
        : '${ExpenseDates.short(_range!.start)} – ${ExpenseDates.short(_range!.end)}';
    return DashPanel(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Previous month',
            icon: const Icon(Icons.chevron_left),
            onPressed: _range == null ? () => _shiftMonth(-1) : null,
          ),
          Expanded(
            child: InkWell(
              onTap: _pickRange,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  children: [
                    Text(label,
                        style: AppTextStyles.labelLarge,
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    Text(_range == null ? 'Tap for custom dates' : 'Custom range',
                        style: AppTextStyles.caption),
                  ],
                ),
              ),
            ),
          ),
          if (_range != null)
            IconButton(
              tooltip: 'Back to this month',
              icon: const Icon(Icons.close),
              onPressed: () {
                final now = FeeFormat.nowIst();
                setState(() {
                  _range = null;
                  _month = DateTime(now.year, now.month);
                });
                _loadRows();
              },
            )
          else
            IconButton(
              tooltip: 'Next month',
              icon: const Icon(Icons.chevron_right),
              onPressed: _atThisMonth ? null : () => _shiftMonth(1),
            ),
        ],
      ),
    );
  }

  Widget _searchField() {
    return TextField(
      controller: _search,
      onChanged: _onSearch,
      textInputAction: TextInputAction.search,
      onSubmitted: (_) => _loadRows(),
      decoration: InputDecoration(
        isDense: true,
        hintText: 'Search particulars, payee, reference…',
        prefixIcon: const Icon(Icons.search),
        suffixIcon: _search.text.isEmpty
            ? null
            : IconButton(
                icon: const Icon(Icons.clear),
                onPressed: () {
                  _search.clear();
                  _loadRows();
                },
              ),
      ),
    );
  }

  Widget _categoryChips() {
    final cats = _meta?.categories ?? _byCategory.map((b) => b.key).toList();
    if (cats.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 6),
            child: ChoiceChip(
              label: const Text('All'),
              selected: _category == null,
              onSelected: (_) {
                setState(() => _category = null);
                _loadRows();
              },
            ),
          ),
          for (final c in cats)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ChoiceChip(
                avatar: Icon(expenseIcon(c), size: 16),
                label: Text(c),
                selected: _category == c,
                onSelected: (sel) {
                  setState(() => _category = sel ? c : null);
                  _loadRows();
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _summaryCard() {
    final top = _byCategory.take(5).toList();
    final maxCat = top.isEmpty ? 0 : top.map((b) => b.total).reduce((a, b) => a > b ? a : b);
    final showMonths = _byMonth.length > 1;
    final maxMonth = _byMonth.isEmpty
        ? 0
        : _byMonth.map((b) => b.total).reduce((a, b) => a > b ? a : b);
    return DashPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('SPENT', style: AppTextStyles.caption.copyWith(letterSpacing: 0.8, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(FeeFormat.rupees(_total),
                      style: AppTextStyles.h2.copyWith(color: AppColors.error)),
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text('$_count ${_count == 1 ? 'entry' : 'entries'}',
                    style: AppTextStyles.caption),
              ),
            ],
          ),
          if (top.isNotEmpty) ...[
            const SizedBox(height: 12),
            for (final b in top)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(expenseIcon(b.key), size: 14, color: expenseColor(b.key)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(b.key,
                              style: AppTextStyles.bodySmall,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                        ),
                        Text(FeeFormat.rupees(b.total),
                            style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    ExpenseBar(
                      fraction: maxCat == 0 ? 0 : b.total / maxCat,
                      color: expenseColor(b.key),
                    ),
                  ],
                ),
              ),
            if (_byCategory.length > top.length)
              Text('+ ${_byCategory.length - top.length} more categories',
                  style: AppTextStyles.caption),
          ],
          if (showMonths) ...[
            const Divider(height: 20),
            const Text('By month', style: AppTextStyles.labelSmall),
            const SizedBox(height: 8),
            for (final m in _byMonth)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    SizedBox(
                      width: 64,
                      child: Text(ExpenseDates.monthLabel(m.key), style: AppTextStyles.caption),
                    ),
                    Expanded(
                      child: ExpenseBar(
                        fraction: maxMonth == 0 ? 0 : m.total / maxMonth,
                        color: AppColors.primary,
                        height: 8,
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 80,
                      child: Text(FeeFormat.rupees(m.total),
                          textAlign: TextAlign.right,
                          style: AppTextStyles.caption.copyWith(color: AppColors.textPrimary)),
                    ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _dueCard(ExpenseMeta meta) {
    return DashPanel(
      border: AppColors.warning.withValues(alpha: 0.5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.event_repeat, color: AppColors.warning, size: 20),
              SizedBox(width: 8),
              Expanded(child: Text('Due this month', style: AppTextStyles.h4)),
            ],
          ),
          const SizedBox(height: 2),
          Text('Regular costs paid recently but not yet entered for ${ExpenseDates.monthLabel(meta.thisMonth)}.',
              style: AppTextStyles.caption),
          const SizedBox(height: 8),
          for (final d in meta.due)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Icon(expenseIcon(d.category), size: 18, color: expenseColor(d.category)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      [
                        d.category,
                        if (d.teacherName != null) d.teacherName!,
                        if (d.locationName != null) d.locationName!,
                        'last ${FeeFormat.rupees(d.amount)}${d.lastMonth != null ? ' (${ExpenseDates.monthShort(d.lastMonth)})' : ''}',
                      ].join(' · '),
                      style: AppTextStyles.bodySmall,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 6),
                  FilledButton.tonal(
                    onPressed: () => _openForm(prefill: d),
                    style: FilledButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                    ),
                    child: const Text('Add'),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  List<Widget> _groupedList() {
    if (_rows.isEmpty) {
      return [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 40),
          child: Column(
            children: [
              const Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.textHint),
              const SizedBox(height: 8),
              Text(
                _category != null || _search.text.trim().isNotEmpty
                    ? 'No expenses match these filters.'
                    : 'No expenses entered for this period.',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              const Text('Tap "Add expense" to enter one.', style: AppTextStyles.caption),
            ],
          ),
        ),
      ];
    }
    final groups = <String, List<ExpenseRow>>{};
    for (final r in _rows) {
      groups.putIfAbsent(r.date, () => []).add(r);
    }
    final out = <Widget>[];
    for (final e in groups.entries) {
      final dayTotal = e.value.fold<num>(0, (t, r) => t + r.amount);
      out.add(Padding(
        padding: const EdgeInsets.fromLTRB(4, 8, 4, 6),
        child: Row(
          children: [
            Expanded(
              child: Text(ExpenseDates.dayHeading(e.key),
                  style: AppTextStyles.labelSmall.copyWith(color: AppColors.textSecondary)),
            ),
            Text(FeeFormat.rupees(dayTotal), style: AppTextStyles.caption),
          ],
        ),
      ));
      out.add(DashPanel(
        padding: EdgeInsets.zero,
        child: Column(
          children: [
            for (var i = 0; i < e.value.length; i++) ...[
              if (i > 0) const Divider(height: 1, indent: 60),
              _ExpenseTile(row: e.value[i], onTap: () => _openDetail(e.value[i])),
            ],
          ],
        ),
      ));
    }
    return out;
  }
}

class _ExpenseTile extends StatelessWidget {
  final ExpenseRow row;
  final VoidCallback onTap;
  const _ExpenseTile({required this.row, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = expenseColor(row.category);
    final sub = [
      row.category,
      if (row.paidTo != null) row.paidTo!,
      if (row.teacherName != null && row.teacherName != row.paidTo) row.teacherName!,
      if (row.locationName != null) row.locationName!,
    ].join(' · ');
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(expenseIcon(row.category), color: color, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(row.particulars,
                      style: AppTextStyles.labelLarge,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  Text(sub,
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
                Text(FeeFormat.rupees(row.amount),
                    style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w600)),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (row.referenceUrl != null)
                      const Padding(
                        padding: EdgeInsets.only(right: 4),
                        child: Icon(Icons.attach_file, size: 14, color: AppColors.textSecondary),
                      ),
                    if (row.paymentMode != null)
                      Text(row.paymentMode!, style: AppTextStyles.caption),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
