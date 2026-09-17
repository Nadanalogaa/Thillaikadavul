import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/fee_format.dart';
import '../../../../data/models/batch_model.dart';
import '../../../../data/models/course_model.dart';
import '../../../../data/models/fee_roster_model.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/receipt_sheet.dart';
import 'collect_cash_sheet.dart';

Color feeStatusColor(String status) {
  switch (status) {
    case FeeStatus.paid:
      return AppColors.success;
    case FeeStatus.overdue:
      return AppColors.error;
    case FeeStatus.partlyPaid:
      return AppColors.warning;
    case FeeStatus.pending:
      return AppColors.primary;
    default:
      return AppColors.textSecondary;
  }
}

/// The admin "Fees" tab: one card per student showing whether this month is
/// paid, with a single clear action (collect cash / receipt / set grade).
/// Self-fetching; the parent screen reaches [FeesRosterTabState] through a
/// GlobalKey to reload or generate bills from its app-bar menu.
class FeesRosterTab extends StatefulWidget {
  const FeesRosterTab({super.key});

  @override
  State<FeesRosterTab> createState() => FeesRosterTabState();
}

class FeesRosterTabState extends State<FeesRosterTab> {
  final _api = sl<ApiClient>();
  final _searchController = TextEditingController();
  Timer? _debounce;

  late final List<String> _periods = FeeFormat.recentPeriods();
  String? _period; // null = current month (omitted in the request)
  String _status = '';
  String _search = '';
  int? _courseId;
  int? _batchId;

  FeeRoster? _data;
  bool _loading = true;
  String? _error;
  int _requestSeq = 0;

  List<CourseModel>? _courses;
  List<BatchModel>? _batches;

  final Set<int> _selected = {}; // student ids chosen for WhatsApp reminders
  bool _sendingReminders = false;

  static const _chips = <(String, String)>[
    ('', 'All'),
    (FeeStatus.overdue, 'Overdue'),
    (FeeStatus.pending, 'Pending'),
    (FeeStatus.partlyPaid, 'Partly paid'),
    (FeeStatus.paid, 'Paid'),
    (FeeStatus.noBill, 'Bill not generated'),
    (FeeStatus.notSetUp, 'Fee not set up'),
  ];

  @override
  void initState() {
    super.initState();
    reload();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  bool get _isCurrentPeriod => _period == null || _period == _periods.first;

  // ---------------------------------------------------------------- data ----

  Future<void> reload() async {
    final seq = ++_requestSeq;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await _api.getFeesRoster(
        period: _isCurrentPeriod ? null : _period,
        status: _status,
        courseId: _courseId,
        batchId: _batchId,
        search: _search,
      );
      if (!mounted || seq != _requestSeq) return;
      final code = r.statusCode ?? 0;
      if (code >= 200 && code < 300 && r.data is Map) {
        final data =
            FeeRoster.fromJson(Map<String, dynamic>.from(r.data as Map));
        setState(() {
          _data = data;
          final selectable = data.rows
              .where((row) => row.unpaidBills.isNotEmpty)
              .map((row) => row.studentId)
              .toSet();
          _selected.removeWhere((id) => !selectable.contains(id));
        });
      } else {
        _setError(feeErrorMessage(r.data, 'Could not load fees.'));
      }
    } on DioException catch (_) {
      if (mounted && seq == _requestSeq) {
        _setError('Network error. Pull down to try again.');
      }
    } catch (_) {
      if (mounted && seq == _requestSeq) _setError('Could not load fees.');
    } finally {
      if (mounted && seq == _requestSeq) setState(() => _loading = false);
    }
  }

  void _setError(String message) {
    if (_data == null) {
      setState(() => _error = message);
    } else {
      _snack(message, error: true);
    }
  }

  void _snack(String message, {bool error = false, bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: error
          ? AppColors.error
          : success
              ? AppColors.success
              : null,
    ));
  }

  void _changeFilters(VoidCallback change) {
    setState(() {
      change();
      _selected.clear();
    });
    reload();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (!mounted || value.trim() == _search) return;
      _changeFilters(() => _search = value.trim());
    });
  }

  /// Generate this month's bills (confirm first), then reload.
  Future<void> generateBills() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Generate this month\'s bills?'),
        content: const Text(
            'Creates a bill for every student with a grade, due on the 10th. '
            'Students who already have a bill are skipped.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(c, true),
              child: const Text('Generate')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      final r = await _api.generateMonthlyInvoices();
      if (!mounted) return;
      final code = r.statusCode ?? 0;
      if (code < 200 || code >= 300 || r.data is! Map) {
        _snack(feeErrorMessage(r.data, 'Could not generate bills.'),
            error: true);
        return;
      }
      final d = r.data as Map;
      int n(String k) => d[k] is num
          ? (d[k] as num).toInt()
          : int.tryParse('${d[k] ?? 0}') ?? 0;
      final created = n('created');
      final prorated = n('prorated');
      final noGrade = n('noGrade');
      final buf =
          StringBuffer('Created $created ${created == 1 ? 'bill' : 'bills'}');
      if (prorated > 0) buf.write(' ($prorated pro-rata)');
      buf.write('.');
      if (noGrade > 0) {
        buf.write(
            ' $noGrade ${noGrade == 1 ? 'student has' : 'students have'} no grade.');
      }
      _snack(buf.toString(), success: true);
      reload();
    } catch (_) {
      _snack('Could not generate bills.', error: true);
    }
  }

  Future<void> _ensureFilterOptions() async {
    if (_courses != null && _batches != null) return;
    try {
      final results = await Future.wait([_api.getCourses(), _api.getBatches()]);
      _courses = results[0].data is List
          ? (results[0].data as List)
              .whereType<Map>()
              .map((c) => CourseModel.fromJson(Map<String, dynamic>.from(c)))
              .toList()
          : <CourseModel>[];
      _batches = results[1].data is List
          ? (results[1].data as List)
              .whereType<Map>()
              .map((b) => BatchModel.fromJson(Map<String, dynamic>.from(b)))
              .toList()
          : <BatchModel>[];
    } catch (_) {
      // Leave null so the next open retries; the sheet shows what it has.
    }
  }

  // ------------------------------------------------------------- actions ----

  Future<void> _dial(String phone) async {
    final digits = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (digits.isEmpty) return;
    try {
      await launchUrl(Uri(scheme: 'tel', path: digits));
    } catch (_) {
      _snack('Could not open the dialer.');
    }
  }

  Future<void> _collect(FeeRosterRow row) async {
    final changed = await showCollectCashSheet(context,
        studentId: row.studentId, studentName: row.name);
    if (changed && mounted) reload();
  }

  Future<void> _openReceipt(String receiptNumber) async {
    final reversed =
        await showReceiptSheet(context, receiptNumber, canReverse: true);
    if (reversed && mounted) reload();
  }

  Future<void> _onReceiptAction(FeeRosterRow row) async {
    final numbers = row.bills
        .map((b) => b.receiptNumber)
        .whereType<String>()
        .toSet()
        .toList();
    if (numbers.length == 1) {
      await _openReceipt(numbers.first);
    } else {
      await _showBills(row);
    }
  }

  Future<void> _setGrade(FeeRosterRow row) async {
    await context.push('/admin/users/${row.studentId}');
    if (mounted) reload();
  }

  void _toggleSelected(FeeRosterRow row) {
    if (row.unpaidBills.isEmpty) return;
    setState(() {
      if (!_selected.remove(row.studentId)) _selected.add(row.studentId);
    });
  }

  Future<void> _sendReminders() async {
    final rows = (_data?.rows ?? const <FeeRosterRow>[])
        .where((r) => _selected.contains(r.studentId));
    final ids = [
      for (final r in rows)
        for (final b in r.unpaidBills) b.id,
    ];
    if (ids.isEmpty || _sendingReminders) return;
    setState(() => _sendingReminders = true);
    try {
      final r = await _api.sendInvoiceReminders(ids);
      if (!mounted) return;
      final code = r.statusCode ?? 0;
      if (code < 200 || code >= 300) {
        _snack(feeErrorMessage(r.data, 'Could not send reminders.'),
            error: true);
        return;
      }
      final raw = r.data is Map ? (r.data as Map)['reminders'] : r.data;
      final reminders = raw is List ? raw.whereType<Map>().toList() : <Map>[];
      final links = reminders
          .map((x) => x['wa_link'])
          .whereType<String>()
          .where((l) => l.isNotEmpty)
          .take(5)
          .toList();
      for (final link in links) {
        try {
          await launchUrl(Uri.parse(link),
              mode: LaunchMode.externalApplication);
        } catch (_) {}
      }
      if (!mounted) return;
      setState(() => _selected.clear());
      _snack(
        'Reminders sent for ${reminders.length} ${reminders.length == 1 ? 'bill' : 'bills'}.'
        '${links.isEmpty ? ' No WhatsApp numbers on file.' : ' WhatsApp opened for ${links.length}.'}',
        success: true,
      );
    } catch (_) {
      _snack('Could not send reminders.', error: true);
    } finally {
      if (mounted) setState(() => _sendingReminders = false);
    }
  }

  // ---------------------------------------------------------------- sheets ---

  Future<void> _openFilters() async {
    final sheetFuture = _ensureFilterOptions();
    final result = await showModalBottomSheet<(int?, int?)>(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      builder: (c) => FutureBuilder<void>(
        future: sheetFuture,
        builder: (c, snap) => _FilterSheet(
          loading: snap.connectionState != ConnectionState.done,
          courses: _courses ?? const [],
          batches: _batches ?? const [],
          courseId: _courseId,
          batchId: _batchId,
        ),
      ),
    );
    if (result == null || !mounted) return;
    if (result.$1 == _courseId && result.$2 == _batchId) return;
    _changeFilters(() {
      _courseId = result.$1;
      _batchId = result.$2;
    });
  }

  Future<void> _showBills(FeeRosterRow row) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (sheetContext) => ConstrainedBox(
        constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(sheetContext).height * 0.8),
        child: _BillsSheet(
          row: row,
          period: _data?.period ?? _period ?? _periods.first,
          onReceipt: (no) => _openReceipt(no),
          onCollect: () {
            Navigator.pop(sheetContext);
            _collect(row);
          },
          onSetGrade: () {
            Navigator.pop(sheetContext);
            _setGrade(row);
          },
        ),
      ),
    );
  }

  // ------------------------------------------------------------------ UI ----

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(14) / 14;
    final headerExtent = 112 + (scale.clamp(1.0, 1.6) - 1) * 60;
    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: reload,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(child: _periodAndSummary()),
                SliverPersistentHeader(
                  pinned: true,
                  delegate: _PinnedHeader(
                    extent: headerExtent,
                    child: _chipsAndSearch(),
                  ),
                ),
                ..._listSlivers(),
              ],
            ),
          ),
        ),
        if (_selected.isNotEmpty) _selectionBar(),
      ],
    );
  }

  Widget _periodAndSummary() {
    final s = _data?.summary;
    final current = _period ?? _periods.first;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.only(left: 12, right: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _periods.contains(current) ? current : null,
                    icon:
                        const Icon(Icons.expand_more, color: AppColors.primary),
                    style: AppTextStyles.labelLarge.copyWith(
                        color: AppColors.primary, fontWeight: FontWeight.w600),
                    borderRadius: BorderRadius.circular(12),
                    items: [
                      for (final p in _periods)
                        DropdownMenuItem(value: p, child: Text(p)),
                    ],
                    onChanged: (v) {
                      if (v == null || v == current) return;
                      _changeFilters(() => _period = v);
                    },
                  ),
                ),
              ),
              const Spacer(),
              if (s != null)
                Text('${s.students} students', style: AppTextStyles.caption),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.divider),
            ),
            child: Row(
              children: [
                _summaryCell('Billed', s?.billed, AppColors.textPrimary),
                _summaryDivider(),
                _summaryCell('Collected', s?.collected, AppColors.success),
                _summaryDivider(),
                _summaryCell(
                  'Outstanding',
                  s?.outstanding,
                  (s?.outstanding ?? 0) > 0
                      ? AppColors.error
                      : AppColors.textPrimary,
                ),
              ],
            ),
          ),
          if (s != null && _isCurrentPeriod && s.count(FeeStatus.noBill) > 0)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Material(
                color: AppColors.info.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                child: InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: generateBills,
                  child: Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline,
                            size: 18, color: AppColors.info),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${s.count(FeeStatus.noBill)} ${s.count(FeeStatus.noBill) == 1 ? 'student has' : 'students have'} no bill yet',
                            style: AppTextStyles.bodySmall
                                .copyWith(color: AppColors.textPrimary),
                          ),
                        ),
                        Text('Generate',
                            style: AppTextStyles.labelLarge.copyWith(
                                color: AppColors.info,
                                fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _summaryCell(String label, double? value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(label, style: AppTextStyles.caption),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value == null ? '—' : FeeFormat.rupees(value),
              style: AppTextStyles.labelLarge.copyWith(
                  color: color, fontWeight: FontWeight.w700, fontSize: 15),
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryDivider() =>
      Container(width: 1, height: 28, color: AppColors.divider);

  Widget _chipsAndSearch() {
    final s = _data?.summary;
    final filtersOn = _courseId != null || _batchId != null;
    return Material(
      color: AppColors.background,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: _chips.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final (value, label) = _chips[i];
                final count = s == null
                    ? null
                    : (value.isEmpty ? s.students : s.count(value));
                final selected = _status == value;
                final color =
                    value.isEmpty ? AppColors.primary : feeStatusColor(value);
                return ChoiceChip(
                  label: Text(count == null ? label : '$label  $count'),
                  selected: selected,
                  showCheckmark: false,
                  visualDensity: VisualDensity.compact,
                  selectedColor: color.withValues(alpha: 0.15),
                  labelStyle: AppTextStyles.bodySmall.copyWith(
                    color: selected ? color : AppColors.textPrimary,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  ),
                  side: BorderSide(color: selected ? color : AppColors.divider),
                  onSelected: (_) {
                    if (selected) return;
                    _changeFilters(() => _status = value);
                  },
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 8, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      isDense: true,
                      hintText: 'Search name, phone or ID',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _searchController.text.isEmpty
                          ? null
                          : IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              tooltip: 'Clear search',
                              onPressed: () {
                                _searchController.clear();
                                _debounce?.cancel();
                                _changeFilters(() => _search = '');
                              },
                            ),
                      filled: true,
                      fillColor: AppColors.surface,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.divider),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.divider),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                IconButton(
                  tooltip: 'Filter by course or batch',
                  onPressed: _openFilters,
                  icon: Badge(
                    isLabelVisible: filtersOn,
                    smallSize: 8,
                    child: Icon(Icons.tune,
                        color: filtersOn
                            ? AppColors.primary
                            : AppColors.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _listSlivers() {
    final data = _data;
    if (data == null) {
      if (_loading) {
        return const [
          SliverFillRemaining(
            hasScrollBody: false,
            child: Center(child: CircularProgressIndicator()),
          ),
        ];
      }
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: _centerMessage(
            icon: Icons.cloud_off,
            title: _error ?? 'Could not load fees.',
            action: FilledButton(onPressed: reload, child: const Text('Retry')),
          ),
        ),
      ];
    }
    final filtered = _status.isNotEmpty ||
        _search.isNotEmpty ||
        _courseId != null ||
        _batchId != null;
    return [
      SliverToBoxAdapter(
        child: SizedBox(
          height: 3,
          child: _loading ? const LinearProgressIndicator() : null,
        ),
      ),
      if (data.rows.isEmpty)
        SliverFillRemaining(
          hasScrollBody: false,
          child: _centerMessage(
            icon: filtered ? Icons.search_off : Icons.people_outline,
            title: filtered ? 'No students match' : 'No students yet',
            subtitle: filtered
                ? 'Try another status, search or filter.'
                : 'Active students appear here with their monthly fees.',
          ),
        )
      else
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
          sliver: SliverList.builder(
            itemCount: data.rows.length,
            itemBuilder: (_, i) {
              final row = data.rows[i];
              final selectionMode = _selected.isNotEmpty;
              return _StudentFeeCard(
                row: row,
                selectionMode: selectionMode,
                selected: _selected.contains(row.studentId),
                onTap: selectionMode
                    ? () => _toggleSelected(row)
                    : () => _showBills(row),
                onLongPress:
                    row.unpaidBills.isEmpty ? null : () => _toggleSelected(row),
                onDial: row.phone == null ? null : () => _dial(row.phone!),
                onCollect: () => _collect(row),
                onReceipt: () => _onReceiptAction(row),
                onSetGrade: () => _setGrade(row),
              );
            },
          ),
        ),
    ];
  }

  Widget _centerMessage({
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? action,
  }) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 56, color: AppColors.textSecondary),
          const SizedBox(height: 12),
          Text(title,
              textAlign: TextAlign.center,
              style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600)),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(subtitle,
                textAlign: TextAlign.center,
                style: AppTextStyles.bodyMedium
                    .copyWith(color: AppColors.textSecondary)),
          ],
          if (action != null) ...[const SizedBox(height: 16), action],
        ],
      ),
    );
  }

  Widget _selectionBar() {
    return Material(
      color: AppColors.surface,
      elevation: 8,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
        child: Row(
          children: [
            IconButton(
              tooltip: 'Cancel selection',
              icon: const Icon(Icons.close),
              onPressed: () => setState(() => _selected.clear()),
            ),
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.success,
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: _sendingReminders ? null : _sendReminders,
                icon: _sendingReminders
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.chat),
                label: Text('Send WhatsApp reminder (${_selected.length})'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- widgets ---

class _PinnedHeader extends SliverPersistentHeaderDelegate {
  final double extent;
  final Widget child;

  _PinnedHeader({required this.extent, required this.child});

  @override
  double get minExtent => extent;

  @override
  double get maxExtent => extent;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return SizedBox.expand(
      child: ClipRect(
        child: OverflowBox(
          alignment: Alignment.topCenter,
          maxHeight: double.infinity,
          child: child,
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _PinnedHeader oldDelegate) => true;
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge(this.status);

  @override
  Widget build(BuildContext context) {
    final color = feeStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        FeeStatus.label(status),
        style: AppTextStyles.caption
            .copyWith(color: color, fontWeight: FontWeight.w600, fontSize: 11),
      ),
    );
  }
}

class _StudentFeeCard extends StatelessWidget {
  final FeeRosterRow row;
  final bool selectionMode;
  final bool selected;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final VoidCallback? onDial;
  final VoidCallback onCollect;
  final VoidCallback onReceipt;
  final VoidCallback onSetGrade;

  const _StudentFeeCard({
    required this.row,
    required this.selectionMode,
    required this.selected,
    required this.onTap,
    required this.onLongPress,
    required this.onDial,
    required this.onCollect,
    required this.onReceipt,
    required this.onSetGrade,
  });

  @override
  Widget build(BuildContext context) {
    final color = feeStatusColor(row.status);
    final grades = row.grades
        .map((g) => g.gradeName.isEmpty
            ? g.courseName
            : '${g.courseName}: ${g.gradeName}')
        .join(' · ');
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      color: selected ? AppColors.success.withValues(alpha: 0.08) : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: selected ? AppColors.success : AppColors.divider,
          width: selected ? 1.5 : 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (selectionMode)
                Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Checkbox(
                    value: selected,
                    onChanged: row.unpaidBills.isEmpty ? null : (_) => onTap(),
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            row.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.labelLarge.copyWith(
                                fontWeight: FontWeight.w600, fontSize: 15),
                          ),
                        ),
                        if (row.inactive) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.textSecondary
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text('Inactive',
                                style: AppTextStyles.caption
                                    .copyWith(fontSize: 10)),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Wrap(
                      spacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        if (row.userId != null)
                          Text(row.userId!, style: AppTextStyles.caption),
                        if (row.phone != null)
                          InkWell(
                            onTap: selectionMode ? null : onDial,
                            borderRadius: BorderRadius.circular(6),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.phone,
                                      size: 13, color: AppColors.primary),
                                  const SizedBox(width: 3),
                                  Text(row.phone!,
                                      style: AppTextStyles.caption.copyWith(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w500)),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                    if (row.parentName != null)
                      Text('Parent: ${row.parentName}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.caption),
                    if (grades.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(grades,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.caption
                              .copyWith(color: AppColors.textPrimary)),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  _StatusBadge(row.status),
                  const SizedBox(height: 6),
                  if (row.hasUnpaid) ...[
                    Text('${FeeFormat.rupees(row.due)} due',
                        style: AppTextStyles.labelLarge.copyWith(
                            color: color, fontWeight: FontWeight.w700)),
                    if (row.dueDate != null)
                      Text('by ${FeeFormat.shortDate(row.dueDate)}',
                          style: AppTextStyles.caption.copyWith(fontSize: 11)),
                  ] else if (row.status == FeeStatus.paid)
                    Text('Paid ${FeeFormat.rupees(row.paid)}',
                        style: AppTextStyles.labelLarge.copyWith(
                            color: color, fontWeight: FontWeight.w700)),
                  if (!selectionMode) ...[
                    const SizedBox(height: 6),
                    _action(),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _action() {
    switch (row.status) {
      case FeeStatus.pending:
      case FeeStatus.overdue:
      case FeeStatus.partlyPaid:
        return FilledButton(
          onPressed: onCollect,
          style: FilledButton.styleFrom(
            minimumSize: const Size(0, 40),
            padding: const EdgeInsets.symmetric(horizontal: 14),
          ),
          child: const Text('Collect cash'),
        );
      case FeeStatus.paid:
        return TextButton.icon(
          onPressed: onReceipt,
          style: TextButton.styleFrom(
            minimumSize: const Size(0, 40),
            foregroundColor: AppColors.success,
          ),
          icon: const Icon(Icons.receipt_long, size: 18),
          label: const Text('Receipt'),
        );
      case FeeStatus.notSetUp:
        return OutlinedButton(
          onPressed: onSetGrade,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(0, 40),
            padding: const EdgeInsets.symmetric(horizontal: 14),
          ),
          child: const Text('Set grade'),
        );
      default:
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Text('Bill not generated',
              style: AppTextStyles.caption
                  .copyWith(color: AppColors.textSecondary)),
        );
    }
  }
}

class _BillsSheet extends StatelessWidget {
  final FeeRosterRow row;
  final String period;
  final void Function(String receiptNumber) onReceipt;
  final VoidCallback onCollect;
  final VoidCallback onSetGrade;

  const _BillsSheet({
    required this.row,
    required this.period,
    required this.onReceipt,
    required this.onCollect,
    required this.onSetGrade,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(row.name,
                        style: AppTextStyles.h4
                            .copyWith(fontWeight: FontWeight.w600)),
                    Text(
                      [
                        period,
                        if (row.userId != null) row.userId!,
                        if (row.batchNames.isNotEmpty)
                          row.batchNames.join(', '),
                      ].join(' · '),
                      style: AppTextStyles.caption,
                    ),
                  ],
                ),
              ),
              _StatusBadge(row.status),
            ],
          ),
          const SizedBox(height: 12),
          if (row.bills.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Text(
                row.status == FeeStatus.notSetUp
                    ? 'No grade assigned, so no monthly fee is set up.'
                    : 'No bill generated for $period.',
                textAlign: TextAlign.center,
                style: AppTextStyles.bodyMedium
                    .copyWith(color: AppColors.textSecondary),
              ),
            ),
          for (final b in row.bills) ...[
            _billTile(b),
            const Divider(height: 1),
          ],
          if (row.bills.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Text('Billed ${FeeFormat.rupees(row.billed)}',
                      style: AppTextStyles.bodySmall),
                ),
                Text(
                  row.due > 0
                      ? '${FeeFormat.rupees(row.due)} due'
                      : 'Paid ${FeeFormat.rupees(row.paid)}',
                  style: AppTextStyles.labelLarge.copyWith(
                      color: feeStatusColor(row.status),
                      fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ],
          if (row.hasUnpaid) ...[
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onCollect,
              style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48)),
              icon: const Icon(Icons.payments_outlined),
              label: const Text('Collect cash'),
            ),
          ] else if (row.status == FeeStatus.notSetUp) ...[
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: onSetGrade,
              style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48)),
              child: const Text('Set grade'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _billTile(FeeRosterBill b) {
    final status = b.isPaid
        ? FeeStatus.paid
        : (b.status == FeeStatus.overdue
            ? FeeStatus.overdue
            : FeeStatus.pending);
    final receiptParts = <String>[
      if (b.receiptNumber != null) 'Receipt ${b.receiptNumber}',
      if (b.paymentMethod != null || b.collectedByName != null)
        [
          if (b.paymentMethod != null) FeeFormat.method(b.paymentMethod),
          if (b.collectedByName != null) 'by ${b.collectedByName}',
        ].join(' '),
      if (b.paidAt != null) FeeFormat.shortDateTimeIst(b.paidAt),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(b.courseName, style: AppTextStyles.labelLarge),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (b.isDiscounted) ...[
                        Text(
                          FeeFormat.rupees(b.originalAmount),
                          style: AppTextStyles.caption
                              .copyWith(decoration: TextDecoration.lineThrough),
                        ),
                        const SizedBox(width: 6),
                      ],
                      Text(FeeFormat.rupees(b.amount),
                          style: AppTextStyles.labelLarge
                              .copyWith(fontWeight: FontWeight.w700)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  _StatusBadge(status),
                ],
              ),
            ],
          ),
          Wrap(
            spacing: 10,
            children: [
              if (b.dueDate != null)
                Text('Due ${FeeFormat.shortDate(b.dueDate)}',
                    style: AppTextStyles.caption),
              if (b.proratedFrom != null)
                Text('Pro-rata from ${FeeFormat.shortDate(b.proratedFrom)}',
                    style:
                        AppTextStyles.caption.copyWith(color: AppColors.info)),
              if (b.isDiscounted)
                Text('${b.discountPercentage!.toStringAsFixed(0)}% off',
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.success)),
            ],
          ),
          if (b.isPaid && receiptParts.isNotEmpty) ...[
            const SizedBox(height: 6),
            Material(
              color: AppColors.success.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: b.receiptNumber == null
                    ? null
                    : () => onReceipt(b.receiptNumber!),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  child: Row(
                    children: [
                      const Icon(Icons.receipt_long,
                          size: 16, color: AppColors.success),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          receiptParts.join(' · '),
                          style: AppTextStyles.caption
                              .copyWith(color: AppColors.textPrimary),
                        ),
                      ),
                      if (b.receiptNumber != null)
                        const Icon(Icons.chevron_right,
                            size: 18, color: AppColors.textSecondary),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterSheet extends StatefulWidget {
  final bool loading;
  final List<CourseModel> courses;
  final List<BatchModel> batches;
  final int? courseId;
  final int? batchId;

  const _FilterSheet({
    required this.loading,
    required this.courses,
    required this.batches,
    required this.courseId,
    required this.batchId,
  });

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late int? _courseId = widget.courseId;
  late int? _batchId = widget.batchId;

  @override
  Widget build(BuildContext context) {
    final batches = _courseId == null
        ? widget.batches
        : widget.batches
            .where((b) => b.courseId == null || b.courseId == _courseId)
            .toList();
    final courseValue =
        widget.courses.any((c) => c.id == _courseId) ? _courseId : null;
    final batchValue = batches.any((b) => b.id == _batchId) ? _batchId : null;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Filter students',
              style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          if (widget.loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            )
          else ...[
            DropdownButtonFormField<int?>(
              initialValue: courseValue,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Course',
                border: OutlineInputBorder(),
              ),
              items: [
                const DropdownMenuItem<int?>(
                    value: null, child: Text('All courses')),
                for (final c in widget.courses)
                  DropdownMenuItem<int?>(value: c.id, child: Text(c.name)),
              ],
              onChanged: (v) => setState(() {
                _courseId = v;
                _batchId = null;
              }),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int?>(
              key: ValueKey('batch-$_courseId'),
              initialValue: batchValue,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Batch',
                border: OutlineInputBorder(),
              ),
              items: [
                const DropdownMenuItem<int?>(
                    value: null, child: Text('All batches')),
                for (final b in batches)
                  DropdownMenuItem<int?>(
                      value: b.id,
                      child:
                          Text(b.batchName, overflow: TextOverflow.ellipsis)),
              ],
              onChanged: (v) => setState(() => _batchId = v),
            ),
          ],
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48)),
                  onPressed: () => Navigator.pop(context, (null, null)),
                  child: const Text('Clear'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48)),
                  onPressed: widget.loading
                      ? null
                      : () => Navigator.pop(context, (_courseId, _batchId)),
                  child: const Text('Apply'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
