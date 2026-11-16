import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/user_model.dart';
import '../../../di/injection_container.dart';

/// A parent edits a student's details: name, date of birth, gender, school,
/// standard, parent / guardian name, address and the family email. The phone
/// number is the family's login and is changed by the academy only; class
/// preference, courses and batches are the academy's to set.
/// Returns true when something was saved.
Future<bool> showEditMemberSheet(BuildContext context, UserModel member) async {
  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _EditMemberSheet(member: member),
  );
  return saved == true;
}

class _EditMemberSheet extends StatefulWidget {
  final UserModel member;
  const _EditMemberSheet({required this.member});

  @override
  State<_EditMemberSheet> createState() => _EditMemberSheetState();
}

class _EditMemberSheetState extends State<_EditMemberSheet> {
  late final TextEditingController _name;
  late final TextEditingController _school;
  late final TextEditingController _standard;
  late final TextEditingController _guardian;
  late final TextEditingController _address;
  late final TextEditingController _email;
  String? _dob; // YYYY-MM-DD
  String? _sex;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final m = widget.member;
    _name = TextEditingController(text: m.name);
    _school = TextEditingController(text: m.schoolName ?? '');
    _standard = TextEditingController(text: m.standard ?? '');
    _guardian = TextEditingController(text: m.fatherName ?? '');
    _address = TextEditingController(text: m.address ?? '');
    // A child's own address is a stand-in; the family's real email is contactEmail.
    final own = m.email.toLowerCase().endsWith('.nadanaloga.local') ? '' : m.email;
    _email = TextEditingController(text: m.contactEmail ?? own);
    _dob = _dateOnly(m.dob);
    _sex = _pick(m.sex, const ['Male', 'Female', 'Other']);
  }

  /// "YYYY-MM-DD" from what the server sends: a plain date, or a timestamp
  /// (UTC) for an IST date, which must be shifted back or it shows a day early.
  static String? _dateOnly(String? raw) {
    final s = (raw ?? '').trim();
    if (s.isEmpty) return null;
    if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(s)) return s;
    final parsed = DateTime.tryParse(s);
    if (parsed == null) return s.length >= 10 ? s.substring(0, 10) : null;
    final ist = parsed.toUtc().add(const Duration(hours: 5, minutes: 30));
    return '${ist.year}-${ist.month.toString().padLeft(2, '0')}-${ist.day.toString().padLeft(2, '0')}';
  }

  static String? _pick(String? v, List<String> options) {
    if (v == null) return null;
    final hit = options.where((o) => o.toLowerCase() == v.trim().toLowerCase());
    return hit.isEmpty ? null : hit.first;
  }

  @override
  void dispose() {
    for (final c in [_name, _school, _standard, _guardian, _address, _email]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final initial = DateTime.tryParse(_dob ?? '') ?? DateTime(now.year - 8, now.month, now.day);
    final d = await showDatePicker(
      context: context,
      initialDate: initial.isAfter(now) ? now : initial,
      firstDate: DateTime(now.year - 90),
      lastDate: now,
      helpText: 'Date of birth',
    );
    if (d != null) {
      setState(() => _dob =
          '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}');
    }
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    if (name.length < 2) {
      setState(() => _error = 'Please enter the name.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final r = await sl<ApiClient>().updateHouseholdMember(widget.member.id, {
      'name': name,
      'dob': _dob,
      'sex': _sex,
      'school_name': _school.text.trim(),
      'standard': _standard.text.trim(),
      'father_name': _guardian.text.trim(),
      'address': _address.text.trim(),
      'email': _email.text.trim(),
    });
    if (!mounted) return;
    final code = r.statusCode ?? 0;
    if (code >= 200 && code < 300) {
      Navigator.of(context).pop(true);
      return;
    }
    setState(() {
      _busy = false;
      _error = r.data is Map && r.data['message'] is String
          ? r.data['message'] as String
          : 'Could not save. Please try again.';
    });
  }

  InputDecoration _dec(String label, {String? hint}) => InputDecoration(
        labelText: label,
        hintText: hint,
        border: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
        isDense: true,
      );

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Edit ${widget.member.name.split(' ').first}\'s details',
                style: AppTextStyles.h4),
            const SizedBox(height: 4),
            Text(
              'The phone number is your sign-in; ask the academy to change it. Courses, batches and class timings are set by the academy.',
              style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            TextField(controller: _name, decoration: _dec('Full name'), textCapitalization: TextCapitalization.words),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: _pickDob,
                    borderRadius: BorderRadius.circular(12),
                    child: InputDecorator(
                      decoration: _dec('Date of birth').copyWith(suffixIcon: const Icon(Icons.calendar_today_outlined, size: 18)),
                      child: Text(_dob ?? 'Choose…',
                          style: AppTextStyles.bodyMedium.copyWith(
                              color: _dob == null ? AppColors.textHint : AppColors.textPrimary)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _sex,
                    decoration: _dec('Gender'),
                    items: const [
                      DropdownMenuItem(value: 'Male', child: Text('Male')),
                      DropdownMenuItem(value: 'Female', child: Text('Female')),
                      DropdownMenuItem(value: 'Other', child: Text('Other')),
                    ],
                    onChanged: (v) => setState(() => _sex = v),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(flex: 3, child: TextField(controller: _school, decoration: _dec('School'), textCapitalization: TextCapitalization.words)),
                const SizedBox(width: 12),
                Expanded(flex: 2, child: TextField(controller: _standard, decoration: _dec('Standard', hint: 'e.g. 5'))),
              ],
            ),
            const SizedBox(height: 12),
            TextField(controller: _guardian, decoration: _dec('Parent / guardian name'), textCapitalization: TextCapitalization.words),
            const SizedBox(height: 12),
            TextField(controller: _address, decoration: _dec('Address'), maxLines: 2, textCapitalization: TextCapitalization.sentences),
            const SizedBox(height: 12),
            TextField(
              controller: _email,
              decoration: _dec('Family email', hint: 'you@example.com'),
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: AppTextStyles.caption.copyWith(color: AppColors.error)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(_busy ? 'Saving…' : 'Save changes'),
            ),
          ],
        ),
      ),
    );
  }
}
