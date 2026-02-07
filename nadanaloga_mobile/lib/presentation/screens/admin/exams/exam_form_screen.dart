import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/grade_exam_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/grade_exam/grade_exam_bloc.dart';
import '../../../bloc/grade_exam/grade_exam_event.dart';
import '../../../bloc/grade_exam/grade_exam_state.dart';

class ExamFormScreen extends StatefulWidget {
  final int? examId;

  const ExamFormScreen({super.key, this.examId});

  bool get isEditing => examId != null;

  @override
  State<ExamFormScreen> createState() => _ExamFormScreenState();
}

class _ExamFormScreenState extends State<ExamFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _examNameController = TextEditingController();
  final _courseController = TextEditingController();
  final _locationController = TextEditingController();
  final _syllabusController = TextEditingController();

  DateTime? _examDate;
  TimeOfDay? _examTime;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      if (widget.isEditing) {
        final api = sl<ApiClient>();
        final response = await api.getGradeExams();
        if (response.statusCode == 200 && response.data != null) {
          final all = (response.data as List)
              .map((j) => GradeExamModel.fromJson(j))
              .toList();
          final exam =
              all.where((e) => e.id == widget.examId).firstOrNull;
          if (exam != null) {
            _examNameController.text = exam.examName;
            _courseController.text = exam.course ?? '';
            _locationController.text = exam.location ?? '';
            _syllabusController.text = exam.syllabus ?? '';
            if (exam.examDate != null) {
              try {
                _examDate = DateTime.parse(exam.examDate!);
              } catch (_) {}
            }
            if (exam.examTime != null) {
              try {
                final parts = exam.examTime!.split(':');
                _examTime = TimeOfDay(
                  hour: int.parse(parts[0]),
                  minute: int.parse(parts[1]),
                );
              } catch (_) {}
            }
          }
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _examNameController.dispose();
    _courseController.dispose();
    _locationController.dispose();
    _syllabusController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _examDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() => _examDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _examTime ?? TimeOfDay.now(),
    );
    if (picked != null) {
      setState(() => _examTime = picked);
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

  String _formatTime(TimeOfDay time) {
    return '${time.hour.toString().padLeft(2, '0')}:'
        '${time.minute.toString().padLeft(2, '0')}';
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final data = <String, dynamic>{
      'exam_name': _examNameController.text.trim(),
      'course': _courseController.text.trim().isEmpty
          ? null
          : _courseController.text.trim(),
      'exam_date': _examDate?.toIso8601String(),
      'exam_time': _examTime != null ? _formatTime(_examTime!) : null,
      'location': _locationController.text.trim().isEmpty
          ? null
          : _locationController.text.trim(),
      'syllabus': _syllabusController.text.trim().isEmpty
          ? null
          : _syllabusController.text.trim(),
    };

    if (widget.isEditing) {
      context
          .read<GradeExamBloc>()
          .add(UpdateGradeExam(id: widget.examId!, data: data));
    } else {
      context.read<GradeExamBloc>().add(CreateGradeExam(data));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<GradeExamBloc, GradeExamState>(
      listener: (context, state) {
        if (state is GradeExamOperationSuccess) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message)));
          context.pop(true);
        } else if (state is GradeExamError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEditing ? 'Edit Exam' : 'Add Exam'),
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
                        controller: _examNameController,
                        decoration: const InputDecoration(
                          labelText: 'Exam Name *',
                          prefixIcon: Icon(Icons.quiz),
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Exam name is required';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _courseController,
                        decoration: const InputDecoration(
                          labelText: 'Course',
                          prefixIcon: Icon(Icons.menu_book),
                        ),
                      ),
                      const SizedBox(height: 16),
                      InkWell(
                        onTap: _pickDate,
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Exam Date',
                            prefixIcon: Icon(Icons.calendar_today),
                          ),
                          child: Text(
                            _examDate != null
                                ? _formatDate(_examDate!)
                                : 'Select date',
                            style: _examDate != null
                                ? null
                                : const TextStyle(
                                    color: AppColors.textHint),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      InkWell(
                        onTap: _pickTime,
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Exam Time',
                            prefixIcon: Icon(Icons.access_time),
                          ),
                          child: Text(
                            _examTime != null
                                ? _formatTime(_examTime!)
                                : 'Select time',
                            style: _examTime != null
                                ? null
                                : const TextStyle(
                                    color: AppColors.textHint),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _locationController,
                        decoration: const InputDecoration(
                          labelText: 'Location',
                          prefixIcon: Icon(Icons.location_on_outlined),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _syllabusController,
                        decoration: const InputDecoration(
                          labelText: 'Syllabus',
                          hintText: 'Topics covered...',
                          prefixIcon: Icon(Icons.subject),
                          alignLabelWithHint: true,
                        ),
                        maxLines: 4,
                      ),
                      const SizedBox(height: 24),
                      BlocBuilder<GradeExamBloc, GradeExamState>(
                        builder: (context, state) {
                          final isLoading = state is GradeExamLoading;
                          return FilledButton(
                            onPressed: isLoading ? null : _submit,
                            child: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : Text(widget.isEditing
                                    ? 'Save'
                                    : 'Create'),
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
