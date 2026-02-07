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

  List<CourseModel> _courses = [];
  List<LocationModel> _locations = [];
  List<UserModel> _teachers = [];
  bool _loading = true;

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
          }
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _maxStudentsController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final data = <String, dynamic>{
      'batch_name': _nameController.text.trim(),
      'course_id': _courseId,
      'teacher_id': _teacherId,
      'mode': _mode,
      'location_id': _mode != 'Online' ? _locationId : null,
      'max_students': _maxStudentsController.text.trim().isEmpty
          ? null
          : int.tryParse(_maxStudentsController.text.trim()),
      'schedule': [],
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
