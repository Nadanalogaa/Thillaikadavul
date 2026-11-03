import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/fee_format.dart';
import '../../../../di/injection_container.dart';

/// Who an extra bill is for (the server's audience.type).
enum _Audience { all, course, batch, grade, students }

const _audienceLabels = {
  _Audience.all: 'All students',
  _Audience.course: 'Course',
  _Audience.batch: 'Batch',
  _Audience.grade: 'Grade',
  _Audience.students: 'Specific students',
};

/// Something the admin can pick for the audience: a course, batch, grade or student.
class _Pick {
  final int id;
  final String label;
  final String sub;
  const _Pick(this.id, this.label, [this.sub = '']);
}

class _OptionRow {
  final label = TextEditingController();
  final price = TextEditingController();
  _OptionRow([String l = '']) {
    label.text = l;
  }
  void dispose() {
    label.dispose();
    price.dispose();
  }
}

/// New extra bill: bill chosen students now ("Bill these students"), or offer
/// an item families order themselves ("Families order it", with sizes…).
/// Pops `true` once created.
class ExtraBillFormScreen extends StatefulWidget {
  final List<String> categories;
  const ExtraBillFormScreen({super.key, this.categories = const []});

  @override
  State<ExtraBillFormScreen> createState() => _ExtraBillFormScreenState();
}

class _ExtraBillFormScreenState extends State<ExtraBillFormScreen> {
  static const _defaultCategories = [
    'Costume', 'Grade exam fee', 'Event', 'Book materials', 'Uniform', 'Other'
  ];

  final _api = sl<ApiClient>();
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _amount = TextEditingController();
  final _description = TextEditingController();
  late String _category;
  DateTime? _dueDate;
  bool _orderable = false;
  final List<_OptionRow> _options = [];
  _Audience _audience = _Audience.all;
  final Map<_Audience, Set<int>> _selected = {
    for (final a in _Audience.values) a: <int>{},
  };

  // Audience choices, loaded once.
  final Map<_Audience, List<_Pick>> _choices = {};
  bool _loadingChoices = true;
  String? _choicesError;

  bool _saving = false;
  String? _error;

  List<String> get _categories =>
      widget.categories.isNotEmpty ? widget.categories : _defaultCategories;

  @override
  void initState() {
    super.initState();
    _category = _categories.first;
    _loadChoices();
  }

  @override
  void dispose() {
    _title.dispose();
    _amount.dispose();
    _description.dispose();
    for (final o in _options) {
      o.dispose();
    }
    super.dispose();
  }

  Future<void> _loadChoices() async {
    setState(() {
      _loadingChoices = true;
      _choicesError = null;
    });
    try {
      final r = await Future.wait([
        _api.getCourses(),
        _api.getBatches(),
        _api.getGrades(),
        _api.getUsers(role: 'Student'),
      ]);
      List<Map> rows(int i) =>
          r[i].statusCode == 200 && r[i].data is List ? (r[i].data as List).whereType<Map>().toList() : const [];
      int id(Map m) => m['id'] is int ? m['id'] as int : int.tryParse('${m['id']}') ?? 0;
      String s(dynamic v) => v == null ? '' : '$v'.trim();
      if (!mounted) return;
      setState(() {
        _choices[_Audience.course] = [
          for (final m in rows(0)) _Pick(id(m), s(m['name'])),
        ]..sort((a, b) => a.label.compareTo(b.label));
        _choices[_Audience.batch] = [
          for (final m in rows(1)) _Pick(id(m), s(m['batch_name']), s(m['course_name'])),
        ]..sort((a, b) => '${a.sub} ${a.label}'.compareTo('${b.sub} ${b.label}'));
        _choices[_Audience.grade] = [
          for (final m in rows(2))
            if (m['is_active'] != false) _Pick(id(m), s(m['name']), s(m['course_name'])),
        ]..sort((a, b) => '${a.sub} ${a.label}'.compareTo('${b.sub} ${b.label}'));
        _choices[_Audience.students] = [
          for (final m in rows(3))
            if (s(m['status']).isEmpty || s(m['status']).toLowerCase() == 'active')
              _Pick(id(m), s(m['name']), [
                s(m['user_id']),
                if (s(m['father_name']).isNotEmpty) 'Parent: ${s(m['father_name'])}',
              ].where((e) => e.isNotEmpty).join(' · ')),
        ]..sort((a, b) => a.label.toLowerCase().compareTo(b.label.toLowerCase()));
        if (r.any((x) => x.statusCode != 200)) {
          _choicesError = 'Some lists could not be loaded.';
        }
      });
    } catch (_) {
      if (mounted) setState(() => _choicesError = 'Could not load courses, batches and students.');
    } finally {
      if (mounted) setState(() => _loadingChoices = false);
    }
  }

  String _ymd(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? now.add(const Duration(days: 7)),
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
      helpText: 'Due date',
    );
    if (picked != null) setState(() => _dueDate = picked);
  }

  Future<void> _pickMany(_Audience a) async {
    final items = _choices[a] ?? const <_Pick>[];
    final result = await showModalBottomSheet<Set<int>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _MultiPickSheet(
        title: 'Choose ${_audienceLabels[a]!.toLowerCase()}${a == _Audience.students ? '' : 's'}',
        items: items,
        selected: _selected[a]!,
        searchable: a == _Audience.students || items.length > 12,
      ),
    );
    if (result != null) setState(() => _selected[a] = result);
  }

  Map<String, dynamic>? _body() {
    final amount = double.tryParse(_amount.text.trim());
    final options = <Map<String, dynamic>>[];
    if (_orderable) {
      for (final o in _options) {
        final label = o.label.text.trim();
        if (label.isEmpty) continue;
        final price = double.tryParse(o.price.text.trim());
        options.add({'label': label, 'amount': (price != null && price > 0) ? price : null});
      }
      final labels = options.map((o) => (o['label'] as String).toLowerCase()).toList();
      if (labels.toSet().length != labels.length) {
        setState(() => _error = 'Two options have the same name.');
        return null;
      }
    }
    if (_audience != _Audience.all && _selected[_audience]!.isEmpty) {
      setState(() => _error = 'Pick at least one ${_audienceLabels[_audience]!.toLowerCase()}.');
      return null;
    }
    return {
      'title': _title.text.trim(),
      'category': _category,
      if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
      'amount': amount,
      if (_dueDate != null) 'due_date': _ymd(_dueDate!),
      'mode': _orderable ? 'orderable' : 'assigned',
      'audience': {
        'type': _audience.name,
        'ids': _audience == _Audience.all ? <int>[] : _selected[_audience]!.toList(),
      },
      if (_orderable) 'options': options,
    };
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_formKey.currentState!.validate()) return;
    final body = _body();
    if (body == null) return;

    if (!_orderable) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          title: const Text('Bill these students?'),
          content: Text(
              '${_audience == _Audience.students ? _audienceSummary() : 'Every active student in "${_audienceSummary()}"'} '
              '${_audience == _Audience.students && _selected[_audience]!.length > 1 ? 'get' : 'gets'} a '
              '${FeeFormat.rupees(body['amount'] as num)} bill for "${body['title']}" now, and the families are notified.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Bill them')),
          ],
        ),
      );
      if (ok != true || !mounted) return;
    }

    setState(() => _saving = true);
    try {
      final r = await _api.createFeeCharge(body);
      if (!mounted) return;
      if (r.statusCode == 201 || r.statusCode == 200) {
        final n = r.data is Map ? (r.data['students'] as num?)?.toInt() ?? 0 : 0;
        final who = '$n ${n == 1 ? 'student' : 'students'}';
        await showDialog<void>(
          context: context,
          builder: (c) => AlertDialog(
            icon: const Icon(Icons.check_circle, color: AppColors.success, size: 40),
            title: Text(_orderable ? 'Item offered' : 'Bill created'),
            content: Text(_orderable
                ? '"${body['title']}" can now be ordered for $who. Each order becomes that student\'s bill.'
                : 'This billed $who. The bills are in each family\'s Fees.'),
            actions: [
              FilledButton(onPressed: () => Navigator.pop(c), child: const Text('OK')),
            ],
          ),
        );
        if (mounted) Navigator.of(context).pop(true);
      } else {
        setState(() => _error =
            '${(r.data is Map ? r.data['message'] : null) ?? 'Could not create the bill.'}');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not create the bill. Check the connection.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _audienceSummary() {
    if (_audience == _Audience.all) return 'All students';
    final ids = _selected[_audience]!;
    final names = (_choices[_audience] ?? const <_Pick>[])
        .where((p) => ids.contains(p.id))
        .map((p) => p.label)
        .toList();
    if (names.length <= 3) return names.join(', ');
    return '${names.take(3).join(', ')} +${names.length - 3} more';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New extra bill')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              TextFormField(
                controller: _title,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  hintText: 'e.g. Annual Day costume',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v ?? '').trim().isEmpty ? 'Give the bill a title' : null,
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                initialValue: _category,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Category', border: OutlineInputBorder()),
                items: [
                  for (final c in _categories) DropdownMenuItem(value: c, child: Text(c)),
                ],
                onChanged: (v) => setState(() => _category = v ?? _category),
              ),
              const SizedBox(height: 18),
              const Text('Type', style: AppTextStyles.labelLarge),
              const SizedBox(height: 6),
              _typeTile(
                selected: !_orderable,
                icon: Icons.receipt_long,
                title: 'Bill these students',
                subtitle: 'Every chosen student gets the bill now.',
                onTap: () => setState(() => _orderable = false),
              ),
              const SizedBox(height: 8),
              _typeTile(
                selected: _orderable,
                icon: Icons.shopping_bag_outlined,
                title: 'Families order it',
                subtitle: 'Offer an item (uniform, books). A bill is made only when a family orders.',
                onTap: () => setState(() => _orderable = true),
              ),
              const SizedBox(height: 18),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _amount,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                      decoration: InputDecoration(
                        labelText: _orderable ? 'Price' : 'Amount',
                        helperText: _orderable ? 'per item' : 'per student',
                        prefixText: '₹ ',
                        border: const OutlineInputBorder(),
                      ),
                      validator: (v) {
                        final n = double.tryParse((v ?? '').trim());
                        return n == null || n <= 0 ? 'Enter an amount' : null;
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: _pickDate,
                      borderRadius: BorderRadius.circular(4),
                      child: InputDecorator(
                        decoration: InputDecoration(
                          labelText: 'Due date',
                          border: const OutlineInputBorder(),
                          suffixIcon: _dueDate == null
                              ? const Icon(Icons.event)
                              : IconButton(
                                  tooltip: 'No due date',
                                  icon: const Icon(Icons.clear),
                                  onPressed: () => setState(() => _dueDate = null),
                                ),
                        ),
                        child: Text(
                          _dueDate == null
                              ? 'None'
                              : _dueDate!.year == DateTime.now().year
                                  ? FeeFormat.shortDate(_ymd(_dueDate!))
                                  : FeeFormat.date(_ymd(_dueDate!)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.bodyMedium.copyWith(
                              color: _dueDate == null ? AppColors.textHint : AppColors.textPrimary),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _description,
                textCapitalization: TextCapitalization.sentences,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                  hintText: 'What it is for, collection details…',
                  border: OutlineInputBorder(),
                ),
              ),
              if (_orderable) ...[
                const SizedBox(height: 18),
                _optionsEditor(),
              ],
              const SizedBox(height: 18),
              _audienceEditor(),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.error, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(_error!,
                            style: AppTextStyles.bodySmall.copyWith(color: AppColors.error)),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _saving ? null : _submit,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Icon(_orderable ? Icons.storefront_outlined : Icons.send),
                label: Text(_orderable ? 'Offer to families' : 'Create bills'),
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _typeTile({
    required bool selected,
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    final color = selected ? AppColors.primary : AppColors.textSecondary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withValues(alpha: 0.06) : null,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: selected ? AppColors.primary : AppColors.divider, width: selected ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: color),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(icon, size: 16, color: color),
                      const SizedBox(width: 6),
                      Flexible(child: Text(title, style: AppTextStyles.labelLarge)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _optionsEditor() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Options (sizes, editions…)', style: AppTextStyles.labelLarge),
        Text(
          'Optional. Families must pick one. Leave a price empty to use the main price.',
          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 8),
        for (var i = 0; i < _options.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextField(
                    controller: _options[i].label,
                    decoration: const InputDecoration(
                      labelText: 'Option',
                      hintText: 'e.g. M',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: _options[i].price,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                    decoration: const InputDecoration(
                      labelText: 'Price',
                      hintText: 'Same',
                      prefixText: '₹ ',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Remove',
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => setState(() => _options.removeAt(i).dispose()),
                ),
              ],
            ),
          ),
        Wrap(
          spacing: 8,
          children: [
            TextButton.icon(
              onPressed: () => setState(() => _options.add(_OptionRow())),
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Add option'),
            ),
            if (_options.isEmpty)
              TextButton.icon(
                onPressed: () => setState(() {
                  for (final s in const ['S', 'M', 'L', 'XL']) {
                    _options.add(_OptionRow(s));
                  }
                }),
                icon: const Icon(Icons.straighten, size: 18),
                label: const Text('Add sizes S–XL'),
              ),
          ],
        ),
      ],
    );
  }

  Widget _audienceEditor() {
    final picks = _choices[_audience] ?? const <_Pick>[];
    final selected = _selected[_audience]!;
    final chosen = picks.where((p) => selected.contains(p.id)).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(_orderable ? 'Who can order it' : 'Who gets the bill', style: AppTextStyles.labelLarge),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final a in _Audience.values)
              ChoiceChip(
                label: Text(_audienceLabels[a]!),
                selected: _audience == a,
                onSelected: (_) => setState(() {
                  _audience = a;
                  _error = null;
                }),
              ),
          ],
        ),
        if (_audience != _Audience.all) ...[
          const SizedBox(height: 10),
          if (_loadingChoices)
            const Padding(
              padding: EdgeInsets.all(8),
              child: Center(child: CircularProgressIndicator()),
            )
          else ...[
            if (_choicesError != null)
              Row(
                children: [
                  Expanded(
                    child: Text(_choicesError!,
                        style: AppTextStyles.caption.copyWith(color: AppColors.error)),
                  ),
                  TextButton(onPressed: _loadChoices, child: const Text('Retry')),
                ],
              ),
            if (chosen.isNotEmpty)
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  for (final p in chosen)
                    InputChip(
                      label: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 220),
                        child: Text(
                          p.sub.isNotEmpty && _audience != _Audience.students ? '${p.label} · ${p.sub}' : p.label,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      onDeleted: () => setState(() => selected.remove(p.id)),
                    ),
                ],
              ),
            const SizedBox(height: 4),
            OutlinedButton.icon(
              onPressed: picks.isEmpty ? null : () => _pickMany(_audience),
              icon: const Icon(Icons.checklist, size: 18),
              label: Text(picks.isEmpty
                  ? 'Nothing to choose'
                  : chosen.isEmpty
                      ? 'Choose ${_audienceLabels[_audience]!.toLowerCase()}${_audience == _Audience.students ? '' : 's'}'
                      : '${chosen.length} chosen · change'),
            ),
          ],
        ],
      ],
    );
  }
}

/// Bottom sheet: tick any number of items, with a search box for long lists.
class _MultiPickSheet extends StatefulWidget {
  final String title;
  final List<_Pick> items;
  final Set<int> selected;
  final bool searchable;
  const _MultiPickSheet({
    required this.title,
    required this.items,
    required this.selected,
    required this.searchable,
  });

  @override
  State<_MultiPickSheet> createState() => _MultiPickSheetState();
}

class _MultiPickSheetState extends State<_MultiPickSheet> {
  late final Set<int> _sel = {...widget.selected};
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final q = _q.trim().toLowerCase();
    final shown = q.isEmpty
        ? widget.items
        : widget.items
            .where((p) => p.label.toLowerCase().contains(q) || p.sub.toLowerCase().contains(q))
            .toList();
    final allShownSelected = shown.isNotEmpty && shown.every((p) => _sel.contains(p.id));
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.8,
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.divider,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
              child: Row(
                children: [
                  Expanded(child: Text(widget.title, style: AppTextStyles.h4)),
                  TextButton(
                    onPressed: shown.isEmpty
                        ? null
                        : () => setState(() {
                              if (allShownSelected) {
                                _sel.removeAll(shown.map((p) => p.id));
                              } else {
                                _sel.addAll(shown.map((p) => p.id));
                              }
                            }),
                    child: Text(allShownSelected ? 'Clear' : 'Select all'),
                  ),
                ],
              ),
            ),
            if (widget.searchable)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search',
                    prefixIcon: Icon(Icons.search),
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (v) => setState(() => _q = v),
                ),
              ),
            Expanded(
              child: shown.isEmpty
                  ? Center(
                      child: Text('No matches',
                          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)))
                  : ListView.builder(
                      itemCount: shown.length,
                      itemBuilder: (_, i) {
                        final p = shown[i];
                        return CheckboxListTile(
                          value: _sel.contains(p.id),
                          dense: true,
                          controlAffinity: ListTileControlAffinity.leading,
                          title: Text(p.label, maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: p.sub.isEmpty
                              ? null
                              : Text(p.sub, maxLines: 1, overflow: TextOverflow.ellipsis),
                          onChanged: (v) => setState(() {
                            if (v == true) {
                              _sel.add(p.id);
                            } else {
                              _sel.remove(p.id);
                            }
                          }),
                        );
                      },
                    ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(_sel),
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(46)),
                  child: Text(_sel.isEmpty ? 'Done' : 'Done · ${_sel.length} chosen'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
