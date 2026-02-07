import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
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
  List<CourseModel> _courses = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final api = sl<ApiClient>();
      final coursesResp = await api.getCourses();
      if (coursesResp.statusCode == 200) {
        _courses = (coursesResp.data as List)
            .map((j) => CourseModel.fromJson(j))
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
            _monthlyController.text = fs.monthlyFee?.toStringAsFixed(0) ?? '';
            _quarterlyController.text =
                fs.quarterlyFee?.toStringAsFixed(0) ?? '';
            _halfYearlyController.text =
                fs.halfYearlyFee?.toStringAsFixed(0) ?? '';
            _annualController.text = fs.annualFee?.toStringAsFixed(0) ?? '';
          }
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
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

    final data = <String, dynamic>{
      'course_id': _courseId,
      'mode': _mode,
      'monthly_fee': _parseAmount(_monthlyController.text),
      'quarterly_fee': _parseAmount(_quarterlyController.text),
      'half_yearly_fee': _parseAmount(_halfYearlyController.text),
      'annual_fee': _parseAmount(_annualController.text),
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
