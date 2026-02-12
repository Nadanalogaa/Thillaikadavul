import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/batch_model.dart';
import '../../../../data/models/course_model.dart';
import '../../../../data/models/fee_structure_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/fee/fee_bloc.dart';
import '../../../bloc/fee/fee_event.dart';
import '../../../bloc/fee/fee_state.dart';

class FeeStructureFormScreen extends StatefulWidget {
  final int? structureId;

  const FeeStructureFormScreen({super.key, this.structureId});

  bool get isEditing => structureId != null;

  @override
  State<FeeStructureFormScreen> createState() => _FeeStructureFormScreenState();
}

class _FeeStructureFormScreenState extends State<FeeStructureFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _monthlyController = TextEditingController();
  final _quarterlyController = TextEditingController();
  final _halfYearlyController = TextEditingController();
  final _annualController = TextEditingController();

  int? _courseId;
  String _mode = 'Hybrid';
  List<int> _selectedBatchIds = [];
  List<CourseModel> _courses = [];
  List<BatchModel> _allBatches = [];
  List<BatchModel> _courseBatches = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final api = sl<ApiClient>();

      // Load courses and batches in parallel
      final results = await Future.wait([
        api.getCourses(),
        api.getBatches(),
      ]);

      if (results[0].statusCode == 200) {
        _courses = (results[0].data as List)
            .map((j) => CourseModel.fromJson(j))
            .toList();
      }

      if (results[1].statusCode == 200) {
        _allBatches = (results[1].data as List)
            .map((j) => BatchModel.fromJson(j))
            .toList();
      }

      if (widget.isEditing) {
        final structResp = await api.getFeeStructures();
        if (structResp.statusCode == 200) {
          final all = (structResp.data as List)
              .map((j) => FeeStructureModel.fromJson(j))
              .toList();
          final fs = all.where((s) => s.id == widget.structureId).firstOrNull;
          if (fs != null) {
            _courseId = fs.courseId;
            _mode = fs.mode ?? 'Hybrid';
            _selectedBatchIds = List.from(fs.batchIds);
            _monthlyController.text = fs.monthlyFee?.toStringAsFixed(0) ?? '';
            _quarterlyController.text =
                fs.quarterlyFee?.toStringAsFixed(0) ?? '';
            _halfYearlyController.text =
                fs.halfYearlyFee?.toStringAsFixed(0) ?? '';
            _annualController.text = fs.annualFee?.toStringAsFixed(0) ?? '';

            // Filter batches for the selected course
            if (_courseId != null) {
              _filterBatchesByCourse(_courseId!);
            }
          }
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  void _filterBatchesByCourse(int courseId) {
    setState(() {
      _courseBatches = _allBatches
          .where((b) => b.courseId == courseId)
          .toList();

      // Clear selections that are not in the new course
      _selectedBatchIds = _selectedBatchIds
          .where((id) => _courseBatches.any((b) => b.id == id))
          .toList();
    });
  }

  @override
  void dispose() {
    _monthlyController.dispose();
    _quarterlyController.dispose();
    _halfYearlyController.dispose();
    _annualController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedBatchIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one batch'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final data = <String, dynamic>{
      'course_id': _courseId,
      'mode': _mode,
      'monthly_fee': _parseAmount(_monthlyController.text),
      'quarterly_fee': _parseAmount(_quarterlyController.text),
      'half_yearly_fee': _parseAmount(_halfYearlyController.text),
      'annual_fee': _parseAmount(_annualController.text),
      'batch_ids': _selectedBatchIds,
    };

    if (widget.isEditing) {
      context
          .read<FeeBloc>()
          .add(UpdateFeeStructure(id: widget.structureId!, data: data));
    } else {
      context.read<FeeBloc>().add(CreateFeeStructure(data));
    }
  }

  double? _parseAmount(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return null;
    return double.tryParse(trimmed);
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<FeeBloc, FeeState>(
      listener: (context, state) {
        if (state is FeeOperationSuccess) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message)));
          context.pop();
        } else if (state is FeeError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(
              widget.isEditing ? 'Edit Fee Structure' : 'Add Fee Structure'),
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
                      // Course Selection
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
                        onChanged: (v) {
                          if (v != null) {
                            setState(() => _courseId = v);
                            _filterBatchesByCourse(v);
                          }
                        },
                        validator: (v) => v == null ? 'Select a course' : null,
                      ),
                      const SizedBox(height: 16),

                      // Batch Multi-Selection
                      if (_courseId != null) ...[
                        Text('Batches *', style: AppTextStyles.labelLarge),
                        const SizedBox(height: 8),
                        if (_courseBatches.isEmpty)
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.warning.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: AppColors.warning.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.info_outline,
                                    color: AppColors.warning, size: 20),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'No batches found for this course. Create batches first.',
                                    style: AppTextStyles.caption.copyWith(
                                      color: AppColors.warning,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )
                        else
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        'Select batches (${_selectedBatchIds.length}/${_courseBatches.length})',
                                        style: AppTextStyles.caption.copyWith(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const Spacer(),
                                      TextButton(
                                        onPressed: () {
                                          setState(() {
                                            if (_selectedBatchIds.length ==
                                                _courseBatches.length) {
                                              _selectedBatchIds.clear();
                                            } else {
                                              _selectedBatchIds = _courseBatches
                                                  .map((b) => b.id)
                                                  .toList();
                                            }
                                          });
                                        },
                                        child: Text(
                                          _selectedBatchIds.length ==
                                              _courseBatches.length
                                              ? 'Deselect All'
                                              : 'Select All',
                                        ),
                                      ),
                                    ],
                                  ),
                                  const Divider(),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: _courseBatches.map((batch) {
                                      final isSelected =
                                          _selectedBatchIds.contains(batch.id);
                                      return FilterChip(
                                        label: Text(batch.batchName),
                                        selected: isSelected,
                                        onSelected: (selected) {
                                          setState(() {
                                            if (selected) {
                                              _selectedBatchIds.add(batch.id);
                                            } else {
                                              _selectedBatchIds.remove(batch.id);
                                            }
                                          });
                                        },
                                        selectedColor: AppColors.secondary
                                            .withValues(alpha: 0.15),
                                        checkmarkColor: AppColors.secondary,
                                        side: BorderSide(
                                          color: isSelected
                                              ? AppColors.secondary
                                              : Colors.grey.shade300,
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        const SizedBox(height: 16),
                      ],

                      // Mode Selection
                      DropdownButtonFormField<String>(
                        value: _mode,
                        decoration: const InputDecoration(
                          labelText: 'Mode',
                          prefixIcon: Icon(Icons.computer),
                        ),
                        items: const [
                          DropdownMenuItem(
                              value: 'Online', child: Text('Online')),
                          DropdownMenuItem(
                              value: 'Offline', child: Text('Offline')),
                          DropdownMenuItem(
                              value: 'Hybrid', child: Text('Hybrid')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _mode = v);
                        },
                      ),
                      const SizedBox(height: 24),

                      // Fee Amounts
                      Text('Fee Amounts (\u20B9)',
                          style: AppTextStyles.labelLarge),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _monthlyController,
                        decoration: const InputDecoration(
                          labelText: 'Monthly Fee',
                          prefixText: '\u20B9 ',
                        ),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _quarterlyController,
                        decoration: const InputDecoration(
                          labelText: 'Quarterly Fee',
                          prefixText: '\u20B9 ',
                        ),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _halfYearlyController,
                        decoration: const InputDecoration(
                          labelText: 'Half-Yearly Fee',
                          prefixText: '\u20B9 ',
                        ),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _annualController,
                        decoration: const InputDecoration(
                          labelText: 'Annual Fee',
                          prefixText: '\u20B9 ',
                        ),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 24),

                      // Submit Button
                      BlocBuilder<FeeBloc, FeeState>(
                        builder: (context, state) {
                          final isLoading = state is FeeLoading;
                          return FilledButton(
                            onPressed: isLoading ? null : _submit,
                            child: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
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
