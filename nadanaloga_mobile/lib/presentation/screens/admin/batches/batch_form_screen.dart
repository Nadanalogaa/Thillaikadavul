import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/batch_model.dart';
import '../../../../data/models/course_model.dart';
import '../../../../data/models/location_model.dart';
import '../../../../data/models/user_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/batch/batch_bloc.dart';
import '../../../bloc/batch/batch_event.dart';
import '../../../bloc/batch/batch_state.dart';

class BatchFormScreen extends StatefulWidget {
  final int? batchId;
  const BatchFormScreen({super.key, this.batchId});

  bool get isEditing => batchId != null;

  @override
  State<BatchFormScreen> createState() => _BatchFormScreenState();
}

class _BatchFormScreenState extends State<BatchFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _maxStudentsController = TextEditingController();

  int? _courseId;
  int? _teacherId;
  int? _locationId;
  String _mode = 'Hybrid';
  String? _studio;
  final List<_TimeSlot> _slots = [];

  List<CourseModel> _courses = [];
  List<LocationModel> _locations = [];
  List<UserModel> _teachers = [];
  bool _loading = true;

  static const _weekdays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];
  static const _studios = ['Old Studio', 'New Studio'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final api = sl<ApiClient>();
      final results = await Future.wait([
        api.getCourses(),
        api.getLocations(),
        api.getUsers(role: 'Teacher'),
      ]);

      if (results[0].statusCode == 200) {
        _courses = (results[0].data as List)
            .map((j) => CourseModel.fromJson(j))
            .toList();
      }
      if (results[1].statusCode == 200) {
        _locations = (results[1].data as List)
            .map((j) => LocationModel.fromJson(j))
            .toList();
      }
      if (results[2].statusCode == 200) {
        _teachers = (results[2].data as List)
            .map((j) => UserModel.fromJson(j))
            .toList();
      }

      if (widget.isEditing) {
        final batchResp = await api.getBatches();
        if (batchResp.statusCode == 200) {
          final batches = (batchResp.data as List)
              .map((j) => BatchModel.fromJson(j))
              .toList();
          final batch =
              batches.where((b) => b.id == widget.batchId).firstOrNull;
          if (batch != null) {
            _nameController.text = batch.batchName;
            _maxStudentsController.text =
                batch.maxStudents?.toString() ?? '';
            _courseId = batch.courseId;
            _teacherId = batch.teacherId;
            _locationId = batch.locationId;
            _mode = batch.mode ?? 'Hybrid';
            _studio = _studios.contains(batch.studio) ? batch.studio : null;
            _slots.clear();
            if (batch.timeSlots.isNotEmpty) {
              for (final ts in batch.timeSlots) {
                _slots.add(_TimeSlot(
                  day: ts.day,
                  start: ts.startTime != null ? _parseTime(ts.startTime!) : null,
                  end: ts.endTime != null ? _parseTime(ts.endTime!) : null,
                ));
              }
            } else if (batch.days.isNotEmpty) {
              // Migrate legacy single-time batches: same time on each day.
              final s = batch.startTime != null ? _parseTime(batch.startTime!) : null;
              final e = batch.endTime != null ? _parseTime(batch.endTime!) : null;
              for (final d in batch.days) {
                _slots.add(_TimeSlot(day: d, start: s, end: e));
              }
            }
          }
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  TimeOfDay? _parseTime(String time24) {
    // Postgres TIME columns come back as "HH:MM:SS"; the form sends "HH:MM".
    // Accept both (and ignore any seconds component).
    final parts = time24.split(':');
    if (parts.length >= 2) {
      final hour = int.tryParse(parts[0]);
      final minute = int.tryParse(parts[1]);
      if (hour != null && minute != null) {
        return TimeOfDay(hour: hour, minute: minute);
      }
    }
    return null;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _maxStudentsController.dispose();
    super.dispose();
  }

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.error),
    );
  }

  String _firstUnusedDay() {
    for (final d in _weekdays) {
      if (!_slots.any((s) => s.day == d)) return d;
    }
    return _weekdays.first;
  }

  void _addSlot() => setState(() => _slots.add(_TimeSlot(day: _firstUnusedDay())));

  Future<void> _pickSlotTime(int index, bool isStart) async {
    final current = isStart ? _slots[index].start : _slots[index].end;
    final picked = await showTimePicker(
      context: context,
      initialTime: current ?? TimeOfDay(hour: isStart ? 17 : 18, minute: 0),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _slots[index].start = picked;
        } else {
          _slots[index].end = picked;
        }
      });
    }
  }

  Widget _timeChip(String label, TimeOfDay? t, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        child: Text(
          t != null ? t.format(context) : label,
          style: TextStyle(
              color: t != null ? null : Colors.grey.shade600, fontSize: 13),
        ),
      ),
    );
  }

  Widget _slotRow(int index, _TimeSlot slot) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
        child: Row(
          children: [
            Expanded(
              flex: 4,
              child: DropdownButtonFormField<String>(
                value: slot.day,
                isDense: true,
                decoration: const InputDecoration(border: InputBorder.none),
                items: _weekdays
                    .map((d) => DropdownMenuItem(
                        value: d, child: Text(d.substring(0, 3))))
                    .toList(),
                onChanged: (v) => setState(() {
                  if (v != null) slot.day = v;
                }),
              ),
            ),
            Expanded(
                flex: 3,
                child: _timeChip(
                    'Start', slot.start, () => _pickSlotTime(index, true))),
            const Text('–', style: TextStyle(color: AppColors.textSecondary)),
            Expanded(
                flex: 3,
                child: _timeChip(
                    'End', slot.end, () => _pickSlotTime(index, false))),
            IconButton(
              icon: const Icon(Icons.close, size: 18, color: AppColors.error),
              onPressed: () => setState(() => _slots.removeAt(index)),
            ),
          ],
        ),
      ),
    );
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    if (_slots.isEmpty) {
      _snack('Add at least one day and time');
      return;
    }
    for (final s in _slots) {
      if (s.start == null || s.end == null) {
        _snack('Set start and end time for every day');
        return;
      }
    }

    final timeSlots = _slots
        .map((s) => {
              'day': s.day,
              'start_time': _fmt(s.start!),
              'end_time': _fmt(s.end!),
            })
        .toList();

    final data = <String, dynamic>{
      'batch_name': _nameController.text.trim(),
      'course_id': _courseId,
      'teacher_id': _teacherId,
      'mode': _mode,
      'studio': _studio,
      'location_id': _mode != 'Online' ? _locationId : null,
      'max_students': _maxStudentsController.text.trim().isEmpty
          ? null
          : int.tryParse(_maxStudentsController.text.trim()),
      // Intentionally NOT sending `schedule` — the web stores student
      // assignments there; omitting it lets the backend preserve it.
      'time_slots': timeSlots,
      // Keep days + a representative start/end for backward-compatible display.
      'days': _slots.map((s) => s.day).toList(),
      'start_time': _fmt(_slots.first.start!),
      'end_time': _fmt(_slots.first.end!),
    };

    if (widget.isEditing) {
      context.read<BatchBloc>().add(UpdateBatch(id: widget.batchId!, data: data));
    } else {
      context.read<BatchBloc>().add(CreateBatch(data));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<BatchBloc, BatchState>(
      listener: (context, state) {
        if (state is BatchOperationSuccess) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message)));
          context.pop(true);
        } else if (state is BatchError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEditing ? 'Edit Batch' : 'Create Batch'),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: _nameController,
                        decoration: const InputDecoration(
                          labelText: 'Batch Name *',
                          prefixIcon: Icon(Icons.group_work),
                        ),
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                      const SizedBox(height: 16),

                      // Course
                      DropdownButtonFormField<int>(
                        value: _courseId,
                        decoration: const InputDecoration(
                          labelText: 'Course *',
                          prefixIcon: Icon(Icons.menu_book),
                        ),
                        items: _courses
                            .map((c) => DropdownMenuItem(
                                value: c.id, child: Text(c.name)))
                            .toList(),
                        onChanged: (v) => setState(() => _courseId = v),
                        validator: (v) => v == null ? 'Select a course' : null,
                      ),
                      const SizedBox(height: 16),

                      // Teacher
                      DropdownButtonFormField<int>(
                        value: _teacherId,
                        decoration: const InputDecoration(
                          labelText: 'Teacher',
                          prefixIcon: Icon(Icons.person),
                        ),
                        items: _teachers
                            .map((t) => DropdownMenuItem(
                                value: t.id, child: Text(t.name)))
                            .toList(),
                        onChanged: (v) => setState(() => _teacherId = v),
                      ),
                      const SizedBox(height: 16),

                      // Mode
                      DropdownButtonFormField<String>(
                        value: _mode,
                        decoration: const InputDecoration(
                          labelText: 'Mode',
                          prefixIcon: Icon(Icons.computer),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Online', child: Text('Online')),
                          DropdownMenuItem(value: 'Offline', child: Text('Offline')),
                          DropdownMenuItem(value: 'Hybrid', child: Text('Hybrid')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _mode = v);
                        },
                      ),
                      const SizedBox(height: 16),

                      // Location
                      if (_mode != 'Online' && _locations.isNotEmpty) ...[
                        DropdownButtonFormField<int>(
                          value: _locationId,
                          decoration: const InputDecoration(
                            labelText: 'Location',
                            prefixIcon: Icon(Icons.location_on),
                          ),
                          items: _locations
                              .map((l) => DropdownMenuItem(
                                  value: l.id, child: Text(l.name)))
                              .toList(),
                          onChanged: (v) => setState(() => _locationId = v),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Max students
                      TextFormField(
                        controller: _maxStudentsController,
                        decoration: const InputDecoration(
                          labelText: 'Max Students',
                          prefixIcon: Icon(Icons.people),
                        ),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 16),

                      // Studio
                      DropdownButtonFormField<String>(
                        value: _studio,
                        decoration: const InputDecoration(
                          labelText: 'Studio',
                          prefixIcon: Icon(Icons.home_work_outlined),
                        ),
                        items: _studios
                            .map((s) =>
                                DropdownMenuItem(value: s, child: Text(s)))
                            .toList(),
                        onChanged: (v) => setState(() => _studio = v),
                      ),
                      const SizedBox(height: 16),

                      // Class days & per-day timings
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Class Days & Timings *',
                              style: AppTextStyles.labelLarge),
                          TextButton.icon(
                            onPressed: _addSlot,
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('Add day'),
                          ),
                        ],
                      ),
                      if (_slots.isEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            'Add each day and its time — e.g. Mon 5–6 PM, Wed 6–7 PM.',
                            style: AppTextStyles.caption
                                .copyWith(color: AppColors.textSecondary),
                          ),
                        ),
                      ..._slots
                          .asMap()
                          .entries
                          .map((e) => _slotRow(e.key, e.value)),
                      const SizedBox(height: 24),

                      BlocBuilder<BatchBloc, BatchState>(
                        builder: (context, state) {
                          final isLoading = state is BatchLoading;
                          return FilledButton(
                            onPressed: isLoading ? null : _submit,
                            child: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : Text(widget.isEditing ? 'Save' : 'Create'),
                          );
                        },
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}

/// Editable per-day time slot used by the batch form.
class _TimeSlot {
  String day;
  TimeOfDay? start;
  TimeOfDay? end;
  _TimeSlot({required this.day, this.start, this.end});
}
