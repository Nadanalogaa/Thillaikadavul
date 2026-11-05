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
///
/// The form follows the category: a new expense starts with a grid of
/// categories, then shows only the fields that category needs. Teacher salary
/// asks for the teacher and month, fills the amount from the last salary paid
/// to that teacher and warns if the month is already paid; rent and bills
/// fill in the location's last payee. Descriptions are written for the admin.
class ExpenseFormScreen extends StatefulWidget {
  final ExpenseMeta meta;
  final ExpenseRow? existing;

  /// A "Due this month" row to copy (date today, for month = this month).
  final DueExpense? prefill;

  /// Open straight at this category (e.g. the "Teacher salary" button).
  final String? initialCategory;

  /// The location the expenses list is filtered to, if any.
  final int? defaultLocationId;

  const ExpenseFormScreen({
    super.key,
    required this.meta,
    this.existing,
    this.prefill,
    this.initialCategory,
    this.defaultLocationId,
  });

  @override
  State<ExpenseFormScreen> createState() => _ExpenseFormScreenState();
}

class _ExpenseFormScreenState extends State<ExpenseFormScreen> {
  static const _maxBytes = 10 * 1024 * 1024;

  final _formKey = GlobalKey<FormState>();
  final _otherCategory = TextEditingController();
  final _particulars = TextEditingController();
  final _amount = TextEditingController();
  final _paidTo = TextEditingController();
  final _paidToFocus = FocusNode();
  final _referenceNo = TextEditingController();
  final _notes = TextEditingController();

  /// The chosen category; empty = still on step 1.
  String _cat = '';
  late DateTime _date;
  String? _mode;
  int? _locationId;
  int? _teacherId;
  late String _forMonth;

  // Whether a value is still ours to fill in (the admin has not typed one).
  bool _amountAuto = true;
  bool _paidToAuto = true;
  // Particulars: written for the admin until they choose to edit them.
  bool _particularsTouched = false; // save the typed text, not ours
  bool _editingParticulars = false; // the text field is open
  bool _pickLocation = true;
  bool _more = false;

  // Attachment: a newly chosen file, or the one already saved.
  Uint8List? _fileBytes;
  String? _fileName;
  bool _removeExisting = false;

  bool _saving = false;

  ExpenseMeta get _meta => widget.meta;
  bool get _isEdit => widget.existing != null;
  ExpenseKind get _kind => expenseKindOf(_cat);

  DateTime get _today {
    final n = FeeFormat.nowIst();
    return DateTime(n.year, n.month, n.day);
  }

  String get _thisMonth => ExpenseDates.monthKey(_today);

  @override
  void initState() {
    super.initState();
    _date = _today;
    _forMonth = _thisMonth;
    final e = widget.existing;
    final p = widget.prefill;
    if (e != null) {
      _cat = e.category;
      _date = ExpenseDates.parseYmd(e.date) ?? _today;
      _particulars.text = e.particulars;
      _particularsTouched = true;
      _amount.text = _plain(e.amount);
      _amountAuto = false;
      _paidTo.text = e.paidTo ?? '';
      _paidToAuto = _paidTo.text.isEmpty;
      _mode = e.paymentMode;
      _locationId = e.locationId;
      _teacherId = e.teacherId;
      _forMonth = e.forMonth ?? _thisMonth;
      _referenceNo.text = e.referenceNo ?? '';
      _notes.text = e.notes ?? '';
    } else if (p != null) {
      _cat = p.category;
      _amount.text = p.amount > 0 ? _plain(p.amount) : '';
      _amountAuto = _amount.text.isEmpty;
      _paidTo.text = p.paidTo ?? '';
      _paidToAuto = _paidTo.text.isEmpty;
      _mode = p.paymentMode;
      _locationId = p.locationId ?? widget.defaultLocationId;
      _teacherId = p.teacherId;
    } else {
      _cat = widget.initialCategory ?? '';
      _locationId = widget.defaultLocationId;
    }
    // Keep only values the pickers know.
    if (_locationId != null && !_meta.locations.any((l) => l.id == _locationId)) {
      _locationId = null;
    }
    if (_teacherId != null && !_meta.teachers.any((t) => t.id == _teacherId)) {
      _teacherId = null;
    }
    if (!_monthChoices.contains(_forMonth)) _forMonth = _thisMonth;
    _pickLocation = _locationId == null;
    _more = _notes.text.isNotEmpty ||
        (_referenceNo.text.isNotEmpty && _kind != ExpenseKind.utility);
    if (_cat.isNotEmpty) _applyLast();
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

  // ---- What this category needs -------------------------------------------

  bool get _needsLocation => _kind == ExpenseKind.rent || _kind == ExpenseKind.utility;
  bool get _needsMonth =>
      _kind == ExpenseKind.salary || _needsLocation || _meta.isRecurring(_cat);
  bool get _autoKind =>
      _kind == ExpenseKind.salary ||
      _kind == ExpenseKind.rent ||
      _kind == ExpenseKind.utility ||
      _kind == ExpenseKind.snacks;

  IdName? get _teacher {
    for (final t in _meta.teachers) {
      if (t.id == _teacherId) return t;
    }
    return null;
  }

  IdName? get _location {
    for (final l in _meta.locations) {
      if (l.id == _locationId) return l;
    }
    return null;
  }

  String get _monthName => ExpenseDates.monthLongKey(_forMonth);

  /// The last entry like this one: same category and teacher / location.
  ExpenseHistory? get _last {
    if (_cat.isEmpty) return null;
    for (final h in _meta.history) {
      if (h.category != _cat || h.id == widget.existing?.id) continue;
      if (_kind == ExpenseKind.salary) {
        if (_teacherId == null || h.teacherId != _teacherId) continue;
      } else if (_needsLocation) {
        if (_locationId == null || h.locationId != _locationId) continue;
      }
      return h;
    }
    return null;
  }

  /// This teacher's salary for the chosen month, if already entered.
  ExpenseHistory? get _alreadyPaid {
    if (_kind != ExpenseKind.salary || _teacherId == null) return null;
    for (final h in _meta.history) {
      if (h.category == _cat &&
          h.id != widget.existing?.id &&
          h.teacherId == _teacherId &&
          h.month == _forMonth) {
        return h;
      }
    }
    return null;
  }

  /// The description written for the admin ('' = they write it).
  String get _autoParticulars {
    final loc = _location != null ? ' · ${_location!.name}' : '';
    switch (_kind) {
      case ExpenseKind.salary:
        return _teacher != null ? 'Salary · $_monthName · ${_teacher!.name.trim()}' : '';
      case ExpenseKind.rent:
        return 'Rent · $_monthName$loc';
      case ExpenseKind.utility:
        return '$_cat bill · $_monthName$loc';
      case ExpenseKind.snacks:
        return 'Tea & snacks';
      default:
        return '';
    }
  }

  bool get _showParticularsField =>
      !_autoKind ||
      _editingParticulars ||
      (_autoParticulars.isEmpty && _kind != ExpenseKind.salary);

  /// What will be saved as the particulars.
  String get _particularsValue => _showParticularsField || _particularsTouched
      ? _particulars.text.trim()
      : _autoParticulars;

  /// Prefill from the last similar entry while the admin has not typed their own.
  void _applyLast() {
    final last = _last;
    if (last == null) {
      if (_amountAuto) _amount.clear();
      return;
    }
    if (_amountAuto) _amount.text = _plain(last.amount);
    if (_paidToAuto && _kind != ExpenseKind.salary && last.paidTo != null) {
      _paidTo.text = last.paidTo!;
    }
    if (_mode == null && last.paymentMode != null) _mode = last.paymentMode;
  }

  /// A value behind the written description changed: rewrite it, unless the
  /// admin opened the description to edit it themselves.
  void _contextChanged() {
    if (_particularsTouched && !_editingParticulars) _particularsTouched = false;
  }

  void _chooseCategory(String c) {
    setState(() {
      _cat = c;
      _particularsTouched = false;
      _editingParticulars = false;
      if (!_monthChoices.contains(_forMonth)) _forMonth = _thisMonth;
      _applyLast();
    });
  }

  List<String> get _monthChoices {
    final t = _today;
    // Salary: never a future month. Rent and bills: up to next month.
    final ahead = _kind == ExpenseKind.salary ? 0 : 1;
    final out = <String>[
      for (var i = -ahead; i <= 12; i++)
        ExpenseDates.monthKey(DateTime(t.year, t.month - i)),
    ];
    final saved = widget.existing?.forMonth;
    if (saved != null && !out.contains(saved)) out.add(saved);
    return out;
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date.isAfter(_today) ? _today : _date,
      firstDate: DateTime(2020),
      lastDate: _today,
      helpText: _kind == ExpenseKind.salary ? 'Paid on' : 'Date of purchase / payment',
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
    final salary = _kind == ExpenseKind.salary;
    final fields = <String, dynamic>{
      'expense_date': ExpenseDates.ymd(_date),
      'category': _cat,
      'particulars': _particularsValue,
      'amount': _amount.text.trim().replaceAll(',', ''),
      'paid_to': salary
          ? (_teacher?.name.trim() ?? '')
          : _kind == ExpenseKind.snacks && _paidToAuto
              ? ''
              : _paidTo.text.trim(),
      'payment_mode': _mode ?? '',
      'location_id': _locationId?.toString() ?? '',
      'teacher_id': salary ? (_teacherId?.toString() ?? '') : '',
      'for_month': _needsMonth ? _forMonth : '',
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

  String? _missing() {
    if (_kind == ExpenseKind.salary && _teacherId == null) return 'Choose the teacher.';
    if (_needsLocation && _locationId == null) return 'Choose the location.';
    final n = double.tryParse(_amount.text.trim().replaceAll(',', ''));
    if (n == null || n <= 0) return 'Enter the amount.';
    if (_particularsValue.isEmpty) {
      return _kind == ExpenseKind.travel
          ? 'Enter the trip.'
          : _kind == ExpenseKind.purchase
              ? 'Enter what was bought.'
              : 'Enter the particulars.';
    }
    return null;
  }

  Future<void> _save() async {
    if (_saving) return;
    final formOk = _formKey.currentState?.validate() ?? false;
    final missing = _missing();
    if (!formOk || missing != null) {
      if (missing != null) showErrorSnack(context, missing);
      return;
    }
    // Paying a teacher twice for the same month: ask first.
    final dup = _alreadyPaid;
    if (dup != null) {
      final ok = await ConfirmDialog.show(
        context,
        title: 'Already paid?',
        message: '${_teacher?.name} is already paid for $_monthName '
            '(${FeeFormat.rupees(dup.amount)} on ${_dayShort(dup.date)}). '
            'Add another payment for the same month?',
        confirmLabel: 'Add anyway',
      );
      if (ok != true || !mounted) return;
    }
    setState(() => _saving = true);
    try {
      var r = await _send(confirmDuplicate: dup != null);
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
        final amount = FeeFormat.rupees(num.tryParse(_amount.text.trim()) ?? 0);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(_isEdit ? 'Expense updated.' : 'Added $_particularsValue · $amount.'),
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

  /// "31 Oct" (with the year when it isn't this year).
  String _dayShort(String ymd) {
    final d = ExpenseDates.parseYmd(ymd);
    if (d == null) return ymd;
    final base = '${d.day} ${ExpenseDates.monthsShort[d.month - 1]}';
    return d.year == _today.year ? base : '$base ${d.year}';
  }

  // ---- UI -----------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    if (_cat.isEmpty) return _categoryStep();
    return _detailsStep();
  }

  /// Step 1: what is this expense for?
  Widget _categoryStep() {
    return Scaffold(
      appBar: AppBar(title: const Text('Add expense')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          const Text('What is this expense for?', style: AppTextStyles.h4),
          const SizedBox(height: 12),
          LayoutBuilder(builder: (context, c) {
            final cols = c.maxWidth >= 520 ? 3 : 2;
            return GridView(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: cols,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                mainAxisExtent: 62,
              ),
              children: [for (final c in _meta.categories) _categoryTile(c)],
            );
          }),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.fromLTRB(12, 4, 6, 4),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.textHint),
            ),
            child: Row(
              children: [
                const Icon(Icons.edit_outlined, size: 20, color: AppColors.textSecondary),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _otherCategory,
                    textCapitalization: TextCapitalization.sentences,
                    onChanged: (_) => setState(() {}),
                    onSubmitted: (v) {
                      if (v.trim().isNotEmpty) _chooseCategory(v.trim());
                    },
                    decoration: const InputDecoration(
                      hintText: 'Something else…',
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      filled: false,
                      isDense: true,
                    ),
                  ),
                ),
                FilledButton(
                  onPressed: _otherCategory.text.trim().isEmpty
                      ? null
                      : () => _chooseCategory(_otherCategory.text.trim()),
                  style: FilledButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                  ),
                  child: const Text('Use'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _categoryTile(String c) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: () => _chooseCategory(c),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.divider),
          ),
          child: Row(
            children: [
              _iconBox(c, 34),
              const SizedBox(width: 8),
              Expanded(
                child: Text(c,
                    style: AppTextStyles.bodySmall.copyWith(
                        fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _iconBox(String c, double size) {
    final color = expenseColor(c);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(expenseIcon(c), color: color, size: size * 0.55),
    );
  }

  /// Step 2: only the fields this category needs.
  Widget _detailsStep() {
    final kind = _kind;
    final salary = kind == ExpenseKind.salary;
    final last = _last;
    final dup = _alreadyPaid;
    final existing = widget.existing;
    final hasExistingFile =
        existing?.referenceUrl != null && !_removeExisting && _fileBytes == null;
    const gap = SizedBox(height: 14);
    final amountValue = num.tryParse(_amount.text.trim());

    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit expense' : 'Add expense')),
      bottomNavigationBar: _bottomBar(amountValue, salary),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            // Header: category + change link
            Row(
              children: [
                _iconBox(_cat, 42),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_cat,
                          style: AppTextStyles.h4,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis),
                      if (!_isEdit)
                        InkWell(
                          onTap: () => setState(() {
                            _cat = '';
                            _particularsTouched = false;
                            _editingParticulars = false;
                          }),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Text('Change category',
                                style: AppTextStyles.caption.copyWith(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600)),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Salary: teacher + month
            if (salary) ...[
              DropdownButtonFormField<int>(
                initialValue: _teacherId,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Teacher',
                  prefixIcon: Icon(Icons.school_outlined),
                ),
                hint: const Text('Choose the teacher…'),
                items: [
                  for (final t in _meta.teachers)
                    DropdownMenuItem<int>(
                        value: t.id,
                        child: Text(t.name.trim(), overflow: TextOverflow.ellipsis)),
                ],
                onChanged: (v) => setState(() {
                  _teacherId = v;
                  _amountAuto = _amountAuto || _amount.text.trim().isEmpty;
                  _contextChanged();
                  _applyLast();
                }),
                validator: (v) => v == null ? 'Choose the teacher' : null,
              ),
              gap,
              _monthField('Salary for month'),
              if (_teacher != null && (last != null || dup != null)) ...[
                const SizedBox(height: 10),
                _salaryNote(last, dup),
              ],
              gap,
            ],

            // Rent / bills: location (a chip when already chosen) + month
            if (_needsLocation) ...[
              _locationField(),
              gap,
              _monthField(kind == ExpenseKind.rent ? 'Rent for month' : 'Bill for month'),
              gap,
            ],

            // Amount + date
            TextFormField(
              controller: _amount,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
              decoration: const InputDecoration(
                labelText: 'Amount',
                prefixIcon: Icon(Icons.currency_rupee),
              ),
              onChanged: (_) => setState(() => _amountAuto = false),
              validator: (v) {
                final n = double.tryParse((v ?? '').trim());
                if (n == null || n <= 0) return 'Enter the amount';
                return null;
              },
            ),
            gap,
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(12),
              child: InputDecorator(
                decoration: InputDecoration(
                  labelText: salary ? 'Paid on' : 'Date of purchase / payment',
                  prefixIcon: const Icon(Icons.calendar_today_outlined),
                ),
                child: Text(ExpenseDates.dayHeading(ExpenseDates.ymd(_date)),
                    style: AppTextStyles.bodyMedium),
              ),
            ),
            gap,

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
            gap,

            // Paid to (not for salary — that's the teacher — nor tea & snacks)
            if (!salary && kind != ExpenseKind.snacks) ...[
              _paidToField(kind),
              gap,
            ],
            if (kind == ExpenseKind.utility) ...[
              TextFormField(
                controller: _referenceNo,
                decoration: const InputDecoration(
                  labelText: 'Bill / consumer no. (optional)',
                  prefixIcon: Icon(Icons.tag),
                ),
              ),
              gap,
            ],

            // Particulars: typed, or written for the admin
            if (_showParticularsField)
              TextFormField(
                controller: _particulars,
                textCapitalization: TextCapitalization.sentences,
                maxLines: 2,
                minLines: 1,
                decoration: InputDecoration(
                  labelText: kind == ExpenseKind.travel
                      ? 'Trip (from → to, purpose)'
                      : kind == ExpenseKind.purchase
                          ? 'Items bought'
                          : 'Particulars',
                  hintText: kind == ExpenseKind.travel
                      ? 'Studio → Kalakshetra, costume pickup'
                      : kind == ExpenseKind.purchase
                          ? 'Ghungroos × 6, practice sarees × 2'
                          : 'What was bought or paid for',
                  prefixIcon: const Icon(Icons.notes_outlined),
                ),
                onChanged: (_) => _particularsTouched = true,
                validator: (v) => (v ?? '').trim().isEmpty
                    ? (kind == ExpenseKind.travel
                        ? 'Enter the trip'
                        : kind == ExpenseKind.purchase
                            ? 'Enter what was bought'
                            : 'Enter what was bought or paid for')
                    : null,
              )
            else
              _savedAs(),
            const SizedBox(height: 8),

            // More details: only what isn't already shown
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: () => setState(() => _more = !_more),
                child: Text(_more
                    ? '− Fewer details'
                    : '+ More details (${[
                        if (!_needsLocation) 'location',
                        if (kind != ExpenseKind.utility) 'bill no.',
                        'notes',
                      ].join(', ')})'),
              ),
            ),
            if (_more) ...[
              const SizedBox(height: 6),
              if (!_needsLocation) ...[
                DropdownButtonFormField<int?>(
                  initialValue: _locationId,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Location (optional)',
                    prefixIcon: Icon(Icons.location_on_outlined),
                  ),
                  items: [
                    const DropdownMenuItem<int?>(value: null, child: Text('Not specific')),
                    for (final l in _meta.locations)
                      DropdownMenuItem<int?>(value: l.id, child: Text(l.name)),
                  ],
                  onChanged: (v) => setState(() => _locationId = v),
                ),
                gap,
              ],
              if (kind != ExpenseKind.utility) ...[
                TextFormField(
                  controller: _referenceNo,
                  decoration: const InputDecoration(
                    labelText: 'Bill / receipt no. (optional)',
                    prefixIcon: Icon(Icons.tag),
                  ),
                ),
                gap,
              ],
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
              gap,
            ],

            // Attachment
            const SizedBox(height: 4),
            const Text('Bill / receipt / photo (optional)', style: AppTextStyles.labelSmall),
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
          ],
        ),
      ),
    );
  }

  Widget _bottomBar(num? amount, bool salary) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.divider)),
        ),
        child: Row(
          children: [
            Expanded(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  amount != null && amount > 0 ? FeeFormat.rupees(amount) : '₹0',
                  style: AppTextStyles.h3.copyWith(
                    color: amount != null && amount > 0
                        ? AppColors.textPrimary
                        : AppColors.textHint,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.check),
              label: Text(_isEdit
                  ? 'Save changes'
                  : salary
                      ? 'Record salary'
                      : 'Add expense'),
              style: FilledButton.styleFrom(minimumSize: const Size(0, 48)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _monthField(String label) {
    final choices = _monthChoices;
    return DropdownButtonFormField<String>(
      key: ValueKey('month-$_cat'),
      initialValue: choices.contains(_forMonth) ? _forMonth : null,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.event_repeat),
      ),
      items: [
        for (final m in choices)
          DropdownMenuItem<String>(value: m, child: Text(ExpenseDates.monthLongKey(m))),
      ],
      onChanged: (v) => setState(() {
        if (v != null) _forMonth = v;
        _contextChanged();
      }),
      validator: (v) => v == null ? 'Choose the month' : null,
    );
  }

  Widget _locationField() {
    final loc = _location;
    if (!_pickLocation && loc != null) {
      return InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Location',
          prefixIcon: Icon(Icons.location_on_outlined),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(loc.name,
                  style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ),
            InkWell(
              onTap: () => setState(() => _pickLocation = true),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Text('change',
                    style: AppTextStyles.caption.copyWith(
                        color: AppColors.primary, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      );
    }
    return DropdownButtonFormField<int>(
      initialValue: _locationId,
      isExpanded: true,
      decoration: const InputDecoration(
        labelText: 'Location',
        prefixIcon: Icon(Icons.location_on_outlined),
      ),
      hint: const Text('Choose…'),
      items: [
        for (final l in _meta.locations)
          DropdownMenuItem<int>(value: l.id, child: Text(l.name)),
      ],
      onChanged: (v) => setState(() {
        _locationId = v;
        _amountAuto = _amountAuto || _amount.text.trim().isEmpty;
        _paidToAuto = true;
        _contextChanged();
        _applyLast();
      }),
      validator: (v) => v == null ? 'Choose the location' : null,
    );
  }

  Widget _salaryNote(ExpenseHistory? last, ExpenseHistory? dup) {
    final warn = dup != null;
    final color = warn ? AppColors.warning : AppColors.primary;
    final String text;
    if (dup != null) {
      text = '⚠ ${_teacher!.name.trim()} is already paid for $_monthName: '
          '${FeeFormat.rupees(dup.amount)} on ${_dayShort(dup.date)}';
    } else {
      final l = last!;
      final when = l.forMonth != null
          ? ExpenseDates.monthLongKey(l.forMonth)
          : ExpenseDates.dayHeading(l.date);
      text = 'Last paid ${FeeFormat.rupees(l.amount)} for $when'
          '${l.paymentMode != null ? ' · ${l.paymentMode}' : ''}'
          '${_amountAuto ? ' — filled in below' : ''}';
    }
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: warn ? 0.14 : 0.07),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(text,
          style: AppTextStyles.bodySmall.copyWith(
            color: warn ? const Color(0xFF92400E) : AppColors.primary,
            fontWeight: warn ? FontWeight.w600 : FontWeight.w500,
          )),
    );
  }

  Widget _paidToField(ExpenseKind kind) {
    final label = switch (kind) {
      ExpenseKind.rent => 'Landlord',
      ExpenseKind.utility => 'Paid to (board / provider)',
      ExpenseKind.travel => 'Who travelled',
      ExpenseKind.purchase => 'Shop / vendor',
      _ => 'Paid to (person / shop)',
    };
    final hint = switch (kind) {
      ExpenseKind.utility =>
        RegExp('electric', caseSensitive: false).hasMatch(_cat) ? 'TNEB' : 'Provider',
      ExpenseKind.travel => 'Name',
      _ => null,
    };
    return RawAutocomplete<String>(
      textEditingController: _paidTo,
      focusNode: _paidToFocus,
      optionsBuilder: (v) {
        final q = v.text.trim().toLowerCase();
        if (q.isEmpty) return const Iterable<String>.empty();
        return _meta.paidTo
            .where((p) => p.toLowerCase().contains(q) && p.toLowerCase() != q)
            .take(6);
      },
      fieldViewBuilder: (context, controller, focusNode, onSubmit) => TextFormField(
        controller: controller,
        focusNode: focusNode,
        textCapitalization: TextCapitalization.words,
        onChanged: (_) => _paidToAuto = false,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: Icon(kind == ExpenseKind.travel
              ? Icons.person_outline
              : Icons.storefront_outlined),
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
                    onTap: () {
                      _paidToAuto = false;
                      onSelected(o);
                    },
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// "Saved as Salary · November 2026 · Arun   edit"
  Widget _savedAs() {
    final text = _particularsTouched ? _particulars.text.trim() : _autoParticulars;
    final empty = text.isEmpty;
    return InputDecorator(
      decoration: const InputDecoration(
        labelText: 'Saved as',
        prefixIcon: Icon(Icons.notes_outlined),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              empty ? 'Choose the teacher' : text,
              style: AppTextStyles.bodyMedium.copyWith(
                  color: empty ? AppColors.textHint : AppColors.textPrimary),
            ),
          ),
          if (!empty)
            InkWell(
              onTap: () => setState(() {
                _particulars.text = text;
                _particularsTouched = true;
                _editingParticulars = true;
              }),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Text('edit',
                    style: AppTextStyles.caption.copyWith(
                        color: AppColors.primary, fontWeight: FontWeight.w600)),
              ),
            ),
        ],
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
