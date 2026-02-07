import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/course_model.dart';
import '../../../../data/models/fee_structure_model.dart';
import '../../../../data/models/user_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/fee/fee_bloc.dart';
import '../../../bloc/fee/fee_event.dart';
import '../../../bloc/fee/fee_state.dart';

class CreateInvoiceScreen extends StatefulWidget {
  const CreateInvoiceScreen({super.key});

  @override
  State<CreateInvoiceScreen> createState() => _CreateInvoiceScreenState();
}

class _CreateInvoiceScreenState extends State<CreateInvoiceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();

  int? _studentId;
  int? _feeStructureId;
  String _billingPeriod = 'Monthly';
  DateTime? _issueDate;
  DateTime? _dueDate;

  List<UserModel> _students = [];
  List<FeeStructureModel> _feeStructures = [];
  Map<int, String> _courseNames = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _issueDate = DateTime.now();
    _dueDate = DateTime.now().add(const Duration(days: 30));
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final api = sl<ApiClient>();
      final results = await Future.wait([
        api.getUsers(role: 'Student'),
        api.getFeeStructures(),
        api.getCourses(),
      ]);

      if (results[0].statusCode == 200) {
        _students = (results[0].data as List)
            .map((j) => UserModel.fromJson(j))
            .toList();
      }
      if (results[1].statusCode == 200) {
        _feeStructures = (results[1].data as List)
            .map((j) => FeeStructureModel.fromJson(j))
            .toList();
      }
      if (results[2].statusCode == 200) {
        final courses = (results[2].data as List)
            .map((j) => CourseModel.fromJson(j))
            .toList();
        _courseNames = {for (var c in courses) c.id: c.name};
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _onFeeStructureChanged(int? id) {
    setState(() {
      _feeStructureId = id;
      if (id != null) {
        final fs = _feeStructures.where((f) => f.id == id).firstOrNull;
        if (fs != null) {
          _autoFillAmount(fs);
        }
      }
    });
  }

  void _autoFillAmount(FeeStructureModel fs) {
    double? amount;
    switch (_billingPeriod) {
      case 'Monthly':
        amount = fs.monthlyFee;
        break;
      case 'Quarterly':
        amount = fs.quarterlyFee;
        break;
      case 'Half-Yearly':
        amount = fs.halfYearlyFee;
        break;
      case 'Annual':
        amount = fs.annualFee;
        break;
    }
    if (amount != null) {
      _amountController.text = amount.toStringAsFixed(0);
    }
  }

  void _onBillingPeriodChanged(String? period) {
    if (period == null) return;
    setState(() => _billingPeriod = period);
    if (_feeStructureId != null) {
      final fs =
          _feeStructures.where((f) => f.id == _feeStructureId).firstOrNull;
      if (fs != null) _autoFillAmount(fs);
    }
  }

  Future<void> _pickDate(bool isIssue) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: (isIssue ? _issueDate : _dueDate) ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isIssue) {
          _issueDate = picked;
        } else {
          _dueDate = picked;
        }
      });
    }
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final fs = _feeStructures.where((f) => f.id == _feeStructureId).firstOrNull;
    final courseName =
        fs?.courseId != null ? _courseNames[fs!.courseId] : null;

    final data = <String, dynamic>{
      'student_id': _studentId,
      'fee_structure_id': _feeStructureId,
      'course_name': courseName,
      'amount': double.tryParse(_amountController.text.trim()),
      'currency': 'INR',
      'issue_date': _issueDate?.toIso8601String(),
      'due_date': _dueDate?.toIso8601String(),
      'billing_period': _billingPeriod,
      'status': 'pending',
    };

    context.read<FeeBloc>().add(CreateInvoice(data));
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
        appBar: AppBar(title: const Text('Create Invoice')),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Student picker
                      DropdownButtonFormField<int>(
                        value: _studentId,
                        decoration: const InputDecoration(
                          labelText: 'Student *',
                          prefixIcon: Icon(Icons.person),
                        ),
                        items: _students
                            .map((s) => DropdownMenuItem(
                                value: s.id, child: Text(s.name)))
                            .toList(),
                        onChanged: (v) => setState(() => _studentId = v),
                        validator: (v) =>
                            v == null ? 'Select a student' : null,
                      ),
                      const SizedBox(height: 16),

                      // Fee structure picker
                      DropdownButtonFormField<int>(
                        value: _feeStructureId,
                        decoration: const InputDecoration(
                          labelText: 'Fee Structure *',
                          prefixIcon: Icon(Icons.receipt_long),
                        ),
                        items: _feeStructures.map((fs) {
                          final name = fs.courseId != null
                              ? _courseNames[fs.courseId] ??
                                  'Course #${fs.courseId}'
                              : 'General';
                          return DropdownMenuItem(
                            value: fs.id,
                            child: Text(
                                '$name${fs.mode != null ? " (${fs.mode})" : ""}'),
                          );
                        }).toList(),
                        onChanged: _onFeeStructureChanged,
                        validator: (v) =>
                            v == null ? 'Select a fee structure' : null,
                      ),
                      const SizedBox(height: 16),

                      // Billing period
                      DropdownButtonFormField<String>(
                        value: _billingPeriod,
                        decoration: const InputDecoration(
                          labelText: 'Billing Period',
                          prefixIcon: Icon(Icons.calendar_month),
                        ),
                        items: const [
                          DropdownMenuItem(
                              value: 'Monthly', child: Text('Monthly')),
                          DropdownMenuItem(
                              value: 'Quarterly', child: Text('Quarterly')),
                          DropdownMenuItem(
                              value: 'Half-Yearly',
                              child: Text('Half-Yearly')),
                          DropdownMenuItem(
                              value: 'Annual', child: Text('Annual')),
                        ],
                        onChanged: _onBillingPeriodChanged,
                      ),
                      const SizedBox(height: 16),

                      // Amount
                      TextFormField(
                        controller: _amountController,
                        decoration: const InputDecoration(
                          labelText: 'Amount *',
                          prefixText: '\u20B9 ',
                          prefixIcon: Icon(Icons.currency_rupee),
                        ),
                        keyboardType: TextInputType.number,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Required';
                          if (double.tryParse(v.trim()) == null) {
                            return 'Enter a valid amount';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Dates
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => _pickDate(true),
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'Issue Date',
                                  prefixIcon: Icon(Icons.calendar_today),
                                ),
                                child: Text(
                                  _issueDate != null
                                      ? '${_issueDate!.day}/${_issueDate!.month}/${_issueDate!.year}'
                                      : 'Select',
                                  style: AppTextStyles.bodyMedium,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: InkWell(
                              onTap: () => _pickDate(false),
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'Due Date',
                                  prefixIcon: Icon(Icons.calendar_today),
                                ),
                                child: Text(
                                  _dueDate != null
                                      ? '${_dueDate!.day}/${_dueDate!.month}/${_dueDate!.year}'
                                      : 'Select',
                                  style: AppTextStyles.bodyMedium,
                                ),
                              ),
                            ),
                          ),
                        ],
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
                                : const Text('Create Invoice'),
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
