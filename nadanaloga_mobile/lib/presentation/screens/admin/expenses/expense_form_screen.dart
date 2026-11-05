
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/admin_role.dart';
import '../../../../core/utils/fee_format.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/confirm_dialog.dart';
import 'expense_data.dart';

/// Add or edit one expense. Pops `true` once saved.
class ExpenseFormScreen extends StatefulWidget {
  final ExpenseMeta meta;
  final ExpenseRow? existing;

  /// A "Due this month" row to copy (date today, for month = this month).
  final DueExpense? prefill;

  const ExpenseFormScreen({super.key, required this.meta, this.existing, this.prefill});

  @override
  State<ExpenseFormScreen> createState() => _ExpenseFormScreenState();
}

class _ExpenseFormScreenState extends State<ExpenseFormScreen> {
  static const _other = '__other__';
  static const _maxBytes = 10 * 1024 * 1024;

  final _formKey = GlobalKey<FormState>();
  final _otherCategory = TextEditingController();
  final _particulars = TextEditingController();
  final _amount = TextEditingController();
  final _paidTo = TextEditingController();
  final _paidToFocus = FocusNode();
  final _referenceNo = TextEditingController();
  final _notes = TextEditingController();

  late DateTime _date;
  String? _category; // a meta category, or [_other]
  String? _mode;
  int? _locationId;
  int? _teacherId;
  String? _forMonth;

  // Attachment: a newly chosen file, or the one already saved.
  Uint8List? _fileBytes;
  String? _fileName;
  bool _removeExisting = false;

  bool _saving = false;

  ExpenseMeta get _meta => widget.meta;
  bool get _isEdit => widget.existing != null;

  DateTime get _today {
    final n = FeeFormat.nowIst();
    return DateTime(n.year, n.month, n.day);
  }

  String get _categoryValue =>
      _category == _other ? _otherCategory.text.trim() : (_category ?? '');

  bool get _isTeacherCategory => _categoryValue.toLowerCase().startsWith('teacher');
  bool get _isRecurring => _meta.isRecurring(_categoryValue);

  @override
  void initState() {
    super.initState();
    _date = _today;
    final e = widget.existing;
    final p = widget.prefill;
    if (e != null) {
      _date = ExpenseDates.parseYmd(e.date) ?? _today;
      _setCategory(e.category);
      _particulars.text = e.particulars;
      _amount.text = _plain(e.amount);
      _paidTo.text = e.paidTo ?? '';
      _mode = e.paymentMode;
      _locationId = e.locationId;
      _teacherId = e.teacherId;
      _forMonth = e.forMonth;
      _referenceNo.text = e.referenceNo ?? '';
      _notes.text = e.notes ?? '';
    } else if (p != null) {
      _setCategory(p.category);
      _particulars.text = p.particulars ?? '';
      _amount.text = p.amount > 0 ? _plain(p.amount) : '';
      _paidTo.text = p.paidTo ?? '';
      _mode = p.paymentMode;
      _locationId = p.locationId;
      _teacherId = p.teacherId;
      _forMonth = _meta.thisMonth;
    }
    // Keep only values the dropdowns know.
    if (_locationId != null && !_meta.locations.any((l) => l.id == _locationId)) {
      _locationId = null;
    }
    if (_teacherId != null && !_meta.teachers.any((t) => t.id == _teacherId)) {
      _teacherId = null;
    }
  }

  void _setCategory(String c) {
    if (c.isEmpty) return;
    if (_meta.categories.contains(c)) {
      _category = c;
    } else {
      _category = _other;
      _otherCategory.text = c;
    }
  }

  static String _plain(num n) =>
      n == n.roundToDouble() ? n.round().toString() : n.toString();

  @override
  void dispose() {
    _otherCategory.dispose();
    _particulars.dispose();
    _amount.dispose();
    _paidTo.dispose();
    _paidToFocus.dispose();
    _referenceNo.dispose();
    _notes.dispose();
    super.dispose();
  }

  List<String> get _monthChoices {
    final t = _today;
    final out = <String>[
      for (var i = -1; i <= 12; i++) ExpenseDates.monthKey(DateTime(t.year, t.month - i)),
    ];
    if (_forMonth != null && !out.contains(_forMonth)) out.add(_forMonth!);
    return out;
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date.isAfter(_today) ? _today : _date,
      firstDate: DateTime(2020),
      lastDate: _today,
      helpText: 'Date of purchase / payment',
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _attach() async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo of the bill'),
              onTap: () => Navigator.pop(ctx, 'camera'),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose a photo'),
              onTap: () => Navigator.pop(ctx, 'gallery'),
            ),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf_outlined),
              title: const Text('Choose a PDF or image file'),
              onTap: () => Navigator.pop(ctx, 'file'),
            ),
          ],
        ),
      ),
    );
    if (choice == null) return;
    try {
      Uint8List? bytes;
      String? name;
      if (choice == 'file') {
        final r = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'heic'],
          withData: true,
        );
        final f = r?.files.single;
        bytes = f?.bytes;
        name = f?.name;
      } else {
        final img = await ImagePicker().pickImage(
          source: choice == 'camera' ? ImageSource.camera : ImageSource.gallery,
          imageQuality: 80,
          maxWidth: 2000,
        );
        if (img != null) {
          bytes = await img.readAsBytes();
          name = img.name.contains('.') ? img.name : '${img.name}.jpg';
        }
      }
      if (bytes == null || name == null) return;
      if (bytes.length > _maxBytes) {
        if (mounted) showErrorSnack(context, 'The file is larger than 10 MB.');
        return;
      }
      setState(() {
        _fileBytes = bytes;
        _fileName = name;
      });
    } catch (e) {
      if (mounted) showErrorSnack(context, 'Could not attach the file.');
    }
  }

  FormData _formData({bool confirmDuplicate = false}) {
    final fields = <String, dynamic>{
      'expense_date': ExpenseDates.ymd(_date),
      'category': _categoryValue,
      'particulars': _particulars.text.trim(),
      'amount': _amount.text.trim().replaceAll(',', ''),
      'paid_to': _paidTo.text.trim(),
      'payment_mode': _mode ?? '',
      'location_id': _locationId?.toString() ?? '',
      'teacher_id': _isTeacherCategory ? (_teacherId?.toString() ?? '') : '',
      'for_month': _isRecurring ? (_forMonth ?? '') : '',
      'reference_no': _referenceNo.text.trim(),
      'notes': _notes.text.trim(),
      if (confirmDuplicate) 'confirm_duplicate': 'yes',
      if (_isEdit && _removeExisting && _fileBytes == null) 'remove_reference': 'yes',
    };
    final fd = FormData.fromMap(fields);
    if (_fileBytes != null) {
      fd.files.add(MapEntry(
        'reference',
        MultipartFile.fromBytes(_fileBytes!, filename: _fileName ?? 'reference.jpg'),
      ));
    }
    return fd;
  }

  Future<Response> _send({bool confirmDuplicate = false}) {
    final dio = sl<ApiClient>().dio;
    final data = _formData(confirmDuplicate: confirmDuplicate);
    final opts = Options(
      contentType: 'multipart/form-data',
      sendTimeout: const Duration(seconds: 60),
      receiveTimeout: const Duration(seconds: 60),
    );
    return _isEdit
        ? dio.put(ApiEndpoints.expenseById(widget.existing!.id), data: data, options: opts)
        : dio.post(ApiEndpoints.expenses, data: data, options: opts);
  }

  Future<void> _save() async {
    if (_saving) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    try {
      var r = await _send();
      if (r.statusCode == 409 && r.data is Map && r.data['duplicate'] == true) {
        if (!mounted) return;
        final ok = await ConfirmDialog.show(
          context,
          title: 'Already entered?',
          message: serverMessage(r, 'A matching expense exists. Save anyway?'),
          confirmLabel: 'Save anyway',
        );
        if (ok != true) {
          if (mounted) setState(() => _saving = false);
          return;
        }
        r = await _send(confirmDuplicate: true);
      }
      if (!mounted) return;
      final code = r.statusCode ?? 0;
      if (code >= 200 && code < 300) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(_isEdit ? 'Expense updated.' : 'Expense added.'),
          backgroundColor: AppColors.success,
        ));
        Navigator.of(context).pop(true);
        return;
      }
      showErrorSnack(context, serverMessage(r, 'Could not save the expense.'));
    } catch (_) {
      if (mounted) showErrorSnack(context, 'Connection error. Please try again.');
    }
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    final existing = widget.existing;
    final hasExistingFile =
        existing?.referenceUrl != null && !_removeExisting && _fileBytes == null;
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit expense' : 'Add expense')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            // Date
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(12),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Date of purchase / payment',
                  prefixIcon: Icon(Icons.calendar_today_outlined),
                ),
                child: Text(ExpenseDates.dayHeading(ExpenseDates.ymd(_date)),
                    style: AppTextStyles.bodyMedium),
              ),
            ),
            const SizedBox(height: 14),

            // Category
            DropdownButtonFormField<String>(
              initialValue: _category,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Category',
                prefixIcon: Icon(Icons.category_outlined),
              ),
              items: [
                for (final c in _meta.categories)
                  DropdownMenuItem(
                    value: c,
                    child: Row(children: [
                      Icon(expenseIcon(c), size: 18, color: expenseColor(c)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(c, overflow: TextOverflow.ellipsis)),
                    ]),
                  ),
                const DropdownMenuItem(value: _other, child: Text('Other…')),
              ],
              onChanged: (v) => setState(() {
                _category = v;
                if (_isRecurring && _forMonth == null) {
                  _forMonth = ExpenseDates.monthKey(_date);
                }
              }),
              validator: (v) => v == null ? 'Choose a category' : null,
            ),
            if (_category == _other) ...[
              const SizedBox(height: 10),
              TextFormField(
                controller: _otherCategory,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(labelText: 'Category name'),
                onChanged: (_) => setState(() {}),
                validator: (v) =>
                    (v ?? '').trim().isEmpty ? 'Enter the category' : null,
              ),
            ],
            const SizedBox(height: 14),

            // Teacher (teacher fees only)
            if (_isTeacherCategory && _meta.teachers.isNotEmpty) ...[
              DropdownButtonFormField<int?>(
                initialValue: _teacherId,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Teacher',
                  prefixIcon: Icon(Icons.school_outlined),
                ),
                items: [
                  const DropdownMenuItem<int?>(value: null, child: Text('Not set')),
                  for (final t in _meta.teachers)
                    DropdownMenuItem<int?>(value: t.id, child: Text(t.name)),
                ],
                onChanged: (v) => setState(() {
                  _teacherId = v;
                  if (v != null && _paidTo.text.trim().isEmpty) {
                    _paidTo.text = _meta.teachers.firstWhere((t) => t.id == v).name;
                  }
                }),
              ),
              const SizedBox(height: 14),
            ],

            // Particulars
            TextFormField(
              controller: _particulars,
              textCapitalization: TextCapitalization.sentences,
              maxLines: 2,
              minLines: 1,
              decoration: const InputDecoration(
                labelText: 'Particulars',
                hintText: 'What was bought or paid for',
                prefixIcon: Icon(Icons.notes_outlined),
              ),
              validator: (v) => (v ?? '').trim().isEmpty
                  ? 'Enter what was bought or paid for'
                  : null,
            ),
            const SizedBox(height: 14),

            // Amount
            TextFormField(
              controller: _amount,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
              decoration: const InputDecoration(
                labelText: 'Amount',
                prefixIcon: Icon(Icons.currency_rupee),
              ),
              validator: (v) {
                final n = double.tryParse((v ?? '').trim());
                if (n == null || n <= 0) return 'Enter the amount';
                return null;
              },
            ),
            const SizedBox(height: 14),

            // Paid to, with past payees as suggestions
            RawAutocomplete<String>(
              textEditingController: _paidTo,
              focusNode: _paidToFocus,
              optionsBuilder: (v) {
                final q = v.text.trim().toLowerCase();
                if (q.isEmpty) return const Iterable<String>.empty();
                return _meta.paidTo
                    .where((p) => p.toLowerCase().contains(q) && p.toLowerCase() != q)
                    .take(6);
              },
              fieldViewBuilder: (context, controller, focusNode, onSubmit) =>
                  TextFormField(
                controller: controller,
                focusNode: focusNode,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Paid to (optional)',
                  hintText: 'Shop, landlord, teacher…',
                  prefixIcon: Icon(Icons.storefront_outlined),
                ),
              ),
              optionsViewBuilder: (context, onSelected, options) => Align(
                alignment: Alignment.topLeft,
                child: Material(
                  elevation: 4,
                  borderRadius: BorderRadius.circular(12),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: 220,
                      maxWidth: MediaQuery.of(context).size.width - 32,
                    ),
                    child: ListView(
                      padding: EdgeInsets.zero,
                      shrinkWrap: true,
                      children: [
                        for (final o in options)
                          ListTile(
                            dense: true,
                            leading: const Icon(Icons.history, size: 18),
                            title: Text(o),
                            onTap: () => onSelected(o),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Payment mode
            const Text('Paid by', style: AppTextStyles.labelSmall),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                for (final m in _meta.paymentModes)
                  ChoiceChip(
                    label: Text(m),
                    selected: _mode == m,
                    onSelected: (sel) => setState(() => _mode = sel ? m : null),
                  ),
              ],
            ),
            const SizedBox(height: 14),

            // Location
            DropdownButtonFormField<int?>(
              initialValue: _locationId,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Branch (optional)',
                prefixIcon: Icon(Icons.location_on_outlined),
              ),
              items: [
                const DropdownMenuItem<int?>(value: null, child: Text('Not set / all branches')),
                for (final l in _meta.locations)
                  DropdownMenuItem<int?>(value: l.id, child: Text(l.name)),
              ],
              onChanged: (v) => setState(() => _locationId = v),
            ),
            const SizedBox(height: 14),

            // For month (regular costs)
            if (_isRecurring) ...[
              DropdownButtonFormField<String?>(
                initialValue: _forMonth,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'For month',
                  helperText: 'Which month this rent / fee / bill is for',
                  prefixIcon: Icon(Icons.event_repeat),
                ),
                items: [
                  const DropdownMenuItem<String?>(value: null, child: Text('Not set')),
                  for (final m in _monthChoices)
                    DropdownMenuItem<String?>(value: m, child: Text(ExpenseDates.monthLabel(m))),
                ],
                onChanged: (v) => setState(() => _forMonth = v),
              ),
              const SizedBox(height: 14),
            ],

            // Reference no.
            TextFormField(
              controller: _referenceNo,
              decoration: const InputDecoration(
                labelText: 'Bill / reference no. (optional)',
                prefixIcon: Icon(Icons.tag),
              ),
            ),
            const SizedBox(height: 14),

            // Notes
            TextFormField(
              controller: _notes,
              textCapitalization: TextCapitalization.sentences,
              maxLines: 3,
              minLines: 1,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                prefixIcon: Icon(Icons.sticky_note_2_outlined),
              ),
            ),
            const SizedBox(height: 14),

            // Attachment
            const Text('Bill / receipt', style: AppTextStyles.labelSmall),
            const SizedBox(height: 6),
            if (_fileBytes != null)
              _fileRow(
                icon: Icons.insert_drive_file_outlined,
                name: _fileName ?? 'Attached file',
                hint: '${(_fileBytes!.length / 1024).ceil()} KB · new',
                onRemove: () => setState(() {
                  _fileBytes = null;
                  _fileName = null;
                }),
              )
            else if (hasExistingFile)
              _fileRow(
                icon: Icons.attach_file,
                name: existing!.referenceName ?? 'Attached file',
                hint: 'Saved',
                onRemove: () => setState(() => _removeExisting = true),
              ),
            OutlinedButton.icon(
              onPressed: _attach,
              icon: const Icon(Icons.attach_file),
              label: Text(_fileBytes != null || hasExistingFile
                  ? 'Replace document'
                  : 'Attach bill (PDF or photo, up to 10 MB)'),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.check),
              label: Text(_isEdit ? 'Save changes' : 'Save expense'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _fileRow({
    required IconData icon,
    required String name,
    required String hint,
    required VoidCallback onRemove,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: AppTextStyles.bodySmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                Text(hint, style: AppTextStyles.caption),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Remove',
            icon: const Icon(Icons.close, size: 18),
            onPressed: onRemove,
          ),
        ],
      ),
    );
  }
}
