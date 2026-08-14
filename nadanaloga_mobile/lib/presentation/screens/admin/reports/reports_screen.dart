import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../di/injection_container.dart';

/// Admin reports: fee collections, outstanding fees, and student roster —
/// filterable, viewable in-app, and shareable as CSV.
class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  final _api = sl<ApiClient>();

  String _type = 'collections';
  DateTime? _from;
  DateTime? _to;
  String _status = 'all';

  bool _loading = false;
  List<Map<String, dynamic>> _rows = [];
  double? _total;

  static const _types = {
    'collections': 'Fee Collections',
    'outstanding': 'Outstanding Fees',
    'students': 'Student Roster',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Map<String, dynamic> _query() {
    final q = <String, dynamic>{};
    if (_type == 'collections') {
      if (_from != null) q['from'] = _fmt(_from!);
      if (_to != null) q['to'] = _fmt(_to!);
    } else if (_type == 'outstanding') {
      if (_status != 'all') q['status'] = _status;
    } else if (_type == 'students') {
      if (_status != 'all') q['status'] = _status;
    }
    return q;
  }

  String _fmt(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _rows = [];
      _total = null;
    });
    try {
      final r = await _api.getReport(_type, query: _query());
      if (r.statusCode == 200 && r.data is Map) {
        final data = r.data as Map;
        _rows = ((data['rows'] as List?) ?? [])
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _total = (data['total'] as num?)?.toDouble();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _shareCsv() async {
    try {
      final r = await _api.getReportCsv(_type, query: _query());
      final csv = r.data is String ? r.data as String : r.data.toString();
      await Share.share(csv, subject: '${_types[_type]} report');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Share failed: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports'),
        actions: [
          IconButton(
            icon: const Icon(Icons.ios_share),
            tooltip: 'Share CSV',
            onPressed: _rows.isEmpty ? null : _shareCsv,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: DropdownButtonFormField<String>(
              value: _type,
              decoration: const InputDecoration(
                labelText: 'Report',
                prefixIcon: Icon(Icons.assessment_outlined),
              ),
              items: _types.entries
                  .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                  .toList(),
              onChanged: (v) {
                if (v != null) {
                  setState(() => _type = v);
                  _load();
                }
              },
            ),
          ),
          _filters(),
          const Divider(height: 1),
          if (_total != null)
            Container(
              width: double.infinity,
              color: AppColors.primary.withValues(alpha: 0.06),
              padding: const EdgeInsets.all(12),
              child: Text(
                '${_type == 'collections' ? 'Total collected' : 'Total outstanding'}: ₹${_total!.toStringAsFixed(0)}   ·   ${_rows.length} rows',
                style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary),
              ),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _rows.isEmpty
                    ? Center(
                        child: Text('No data for this report/filter.',
                            style: AppTextStyles.bodyMedium
                                .copyWith(color: AppColors.textSecondary)))
                    : ListView.separated(
                        padding: const EdgeInsets.all(12),
                        itemCount: _rows.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, i) => _rowTile(_rows[i]),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _filters() {
    if (_type == 'collections') {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Row(
          children: [
            Expanded(child: _dateField('From', _from, (d) => setState(() => _from = d))),
            const SizedBox(width: 12),
            Expanded(child: _dateField('To', _to, (d) => setState(() => _to = d))),
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: _load,
            ),
          ],
        ),
      );
    }
    // outstanding / students -> status filter
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Row(
        children: [
          Expanded(
            child: DropdownButtonFormField<String>(
              value: _status,
              decoration: const InputDecoration(labelText: 'Status', isDense: true),
              items: (_type == 'outstanding'
                      ? const ['all', 'pending', 'overdue']
                      : const ['all', 'active', 'inactive'])
                  .map((s) => DropdownMenuItem(value: s, child: Text(s[0].toUpperCase() + s.substring(1))))
                  .toList(),
              onChanged: (v) {
                if (v != null) {
                  setState(() => _status = v);
                  _load();
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _dateField(String label, DateTime? value, ValueChanged<DateTime> onPick) {
    return InkWell(
      onTap: () async {
        final d = await showDatePicker(
          context: context,
          initialDate: value ?? DateTime.now(),
          firstDate: DateTime(2020),
          lastDate: DateTime(2100),
        );
        if (d != null) onPick(d);
      },
      child: InputDecorator(
        decoration: InputDecoration(labelText: label, isDense: true),
        child: Text(value != null ? _fmt(value) : 'Any',
            style: TextStyle(color: value != null ? null : Colors.grey.shade600)),
      ),
    );
  }

  Widget _rowTile(Map<String, dynamic> r) {
    String title, subtitle, trailing;
    if (_type == 'collections') {
      title = '${r['student'] ?? ''}';
      subtitle = '${r['course'] ?? ''} · ${r['method'] ?? ''} · ${r['date'] ?? ''}';
      trailing = '₹${r['amount'] ?? 0}';
    } else if (_type == 'outstanding') {
      title = '${r['student'] ?? ''}';
      subtitle = '${r['course'] ?? ''} · ${r['status'] ?? ''} · due ${r['due'] ?? '-'}';
      trailing = '₹${r['amount'] ?? 0}';
    } else {
      title = '${r['student'] ?? ''}';
      subtitle = '${r['grades'] ?? ''}${r['phone'] != null ? ' · ${r['phone']}' : ''}';
      trailing = '${r['status'] ?? ''}';
    }
    return ListTile(
      dense: true,
      title: Text(title, style: AppTextStyles.labelLarge),
      subtitle: Text(subtitle, style: AppTextStyles.caption),
      trailing: Text(trailing,
          style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary)),
    );
  }
}
