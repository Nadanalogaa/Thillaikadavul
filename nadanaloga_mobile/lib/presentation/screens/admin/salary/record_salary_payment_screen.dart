import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/salary_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/salary/salary_bloc.dart';
import '../../../bloc/salary/salary_event.dart';
import '../../../bloc/salary/salary_state.dart';

class RecordSalaryPaymentScreen extends StatefulWidget {
  final int? preselectedSalaryId;

  const RecordSalaryPaymentScreen({super.key, this.preselectedSalaryId});

  @override
  State<RecordSalaryPaymentScreen> createState() =>
      _RecordSalaryPaymentScreenState();
}

class _RecordSalaryPaymentScreenState extends State<RecordSalaryPaymentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _transactionIdController = TextEditingController();
  final _notesController = TextEditingController();

  int? _salaryId;
  String _paymentMethod = 'Bank Transfer';
  String _paymentPeriod = '';
  DateTime _paymentDate = DateTime.now();
  List<SalaryModel> _salaries = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    // Default payment period to current month
    final now = DateTime.now();
    _paymentPeriod = _monthName(now.month) + ' ${now.year}';
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final response = await sl<ApiClient>().getSalaries();
      if (response.statusCode == 200) {
        _salaries = (response.data as List)
            .map((j) => SalaryModel.fromJson(j))
            .toList();
        if (widget.preselectedSalaryId != null) {
          _salaryId = widget.preselectedSalaryId;
          _autoFillAmount();
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  void _autoFillAmount() {
    final sal = _salaries.where((s) => s.id == _salaryId).firstOrNull;
    if (sal?.baseSalary != null) {
      _amountController.text = sal!.baseSalary!.toStringAsFixed(0);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _paymentDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _paymentDate = picked);
    }
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final sal = _salaries.where((s) => s.id == _salaryId).firstOrNull;

    final data = <String, dynamic>{
      'salary_id': _salaryId,
      'user_id': sal?.userId,
      'amount': double.tryParse(_amountController.text.trim()),
      'payment_date': _paymentDate.toIso8601String(),
      'payment_method': _paymentMethod,
      'transaction_id': _transactionIdController.text.trim().isEmpty
          ? null
          : _transactionIdController.text.trim(),
      'payment_period': _paymentPeriod,
      'notes': _notesController.text.trim().isEmpty
          ? null
          : _notesController.text.trim(),
      'status': 'paid',
    };

    context.read<SalaryBloc>().add(RecordSalaryPayment(data));
  }

  String _monthName(int month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }

  @override
  void dispose() {
    _amountController.dispose();
    _transactionIdController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<SalaryBloc, SalaryState>(
      listener: (context, state) {
        if (state is SalaryOperationSuccess) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message)));
          context.pop(true);
        } else if (state is SalaryError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Record Salary Payment')),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Employee / salary config picker
                      DropdownButtonFormField<int>(
                        value: _salaryId,
                        decoration: const InputDecoration(
                          labelText: 'Employee *',
                          prefixIcon: Icon(Icons.person),
                        ),
                        items: _salaries
                            .map((s) => DropdownMenuItem(
                                value: s.id,
                                child: Text(
                                    '${s.employeeName ?? "Employee #${s.userId}"} (\u20B9${s.baseSalary?.toStringAsFixed(0) ?? "0"})')))
                            .toList(),
                        onChanged: (v) {
                          setState(() => _salaryId = v);
                          _autoFillAmount();
                        },
                        validator: (v) =>
                            v == null ? 'Select an employee' : null,
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

                      // Payment period
                      TextFormField(
                        initialValue: _paymentPeriod,
                        decoration: const InputDecoration(
                          labelText: 'Payment Period',
                          prefixIcon: Icon(Icons.date_range),
                          hintText: 'e.g. January 2026',
                        ),
                        onChanged: (v) => _paymentPeriod = v,
                      ),
                      const SizedBox(height: 16),

                      // Payment method
                      Text('Payment Method', style: AppTextStyles.labelLarge),
                      const SizedBox(height: 8),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(
                              value: 'Bank Transfer',
                              label: Text('Bank'),
                              icon: Icon(Icons.account_balance)),
                          ButtonSegment(
                              value: 'UPI',
                              label: Text('UPI'),
                              icon: Icon(Icons.phone_android)),
                          ButtonSegment(
                              value: 'Cash',
                              label: Text('Cash'),
                              icon: Icon(Icons.money)),
                        ],
                        selected: {_paymentMethod},
                        onSelectionChanged: (s) =>
                            setState(() => _paymentMethod = s.first),
                      ),
                      const SizedBox(height: 16),

                      // Transaction ID
                      if (_paymentMethod != 'Cash') ...[
                        TextFormField(
                          controller: _transactionIdController,
                          decoration: InputDecoration(
                            labelText: _paymentMethod == 'UPI'
                                ? 'UPI Transaction ID'
                                : 'Bank Reference Number',
                            prefixIcon: const Icon(Icons.tag),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Payment date
                      InkWell(
                        onTap: _pickDate,
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Payment Date',
                            prefixIcon: Icon(Icons.calendar_today),
                          ),
                          child: Text(
                            '${_paymentDate.day}/${_paymentDate.month}/${_paymentDate.year}',
                            style: AppTextStyles.bodyMedium,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Notes
                      TextFormField(
                        controller: _notesController,
                        decoration: const InputDecoration(
                          labelText: 'Notes (optional)',
                          prefixIcon: Icon(Icons.note),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 24),

                      BlocBuilder<SalaryBloc, SalaryState>(
                        builder: (context, state) {
                          final isLoading = state is SalaryLoading;
                          return FilledButton(
                            onPressed: isLoading ? null : _submit,
                            child: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : const Text('Record Payment'),
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
