import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/salary_model.dart';
import '../../../../data/models/user_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/salary/salary_bloc.dart';
import '../../../bloc/salary/salary_event.dart';
import '../../../bloc/salary/salary_state.dart';

class SalaryConfigFormScreen extends StatefulWidget {
  final int? salaryId;

  const SalaryConfigFormScreen({super.key, this.salaryId});

  bool get isEditing => salaryId != null;

  @override
  State<SalaryConfigFormScreen> createState() => _SalaryConfigFormScreenState();
}

class _SalaryConfigFormScreenState extends State<SalaryConfigFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _baseSalaryController = TextEditingController();
  final _bankNameController = TextEditingController();
  final _bankAccountController = TextEditingController();
  final _ifscController = TextEditingController();
  final _upiIdController = TextEditingController();

  int? _userId;
  String _frequency = 'Monthly';
  List<UserModel> _employees = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final api = sl<ApiClient>();
      // Load teachers and admins as potential salary recipients
      final results = await Future.wait([
        api.getUsers(role: 'Teacher'),
        api.getUsers(role: 'Admin'),
      ]);

      final teachers = results[0].statusCode == 200
          ? (results[0].data as List).map((j) => UserModel.fromJson(j)).toList()
          : <UserModel>[];
      final admins = results[1].statusCode == 200
          ? (results[1].data as List).map((j) => UserModel.fromJson(j)).toList()
          : <UserModel>[];
      _employees = [...teachers, ...admins];

      if (widget.isEditing) {
        final salResp = await api.getSalaries();
        if (salResp.statusCode == 200) {
          final all = (salResp.data as List)
              .map((j) => SalaryModel.fromJson(j))
              .toList();
          final sal = all.where((s) => s.id == widget.salaryId).firstOrNull;
          if (sal != null) {
            _userId = sal.userId;
            _frequency = sal.paymentFrequency ?? 'Monthly';
            _baseSalaryController.text =
                sal.baseSalary?.toStringAsFixed(0) ?? '';
            _bankNameController.text = sal.bankAccountName ?? '';
            _bankAccountController.text = sal.bankAccountNumber ?? '';
            _ifscController.text = sal.bankIfsc ?? '';
            _upiIdController.text = sal.upiId ?? '';
          }
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _baseSalaryController.dispose();
    _bankNameController.dispose();
    _bankAccountController.dispose();
    _ifscController.dispose();
    _upiIdController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final employee = _employees.where((e) => e.id == _userId).firstOrNull;

    final data = <String, dynamic>{
      'user_id': _userId,
      'role': employee?.role,
      'base_salary': double.tryParse(_baseSalaryController.text.trim()),
      'payment_frequency': _frequency,
      'bank_account_name': _bankNameController.text.trim().isEmpty
          ? null
          : _bankNameController.text.trim(),
      'bank_account_number': _bankAccountController.text.trim().isEmpty
          ? null
          : _bankAccountController.text.trim(),
      'bank_ifsc': _ifscController.text.trim().isEmpty
          ? null
          : _ifscController.text.trim(),
      'upi_id': _upiIdController.text.trim().isEmpty
          ? null
          : _upiIdController.text.trim(),
    };

    if (widget.isEditing) {
      context
          .read<SalaryBloc>()
          .add(UpdateSalary(id: widget.salaryId!, data: data));
    } else {
      context.read<SalaryBloc>().add(CreateSalary(data));
    }
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
        appBar: AppBar(
          title:
              Text(widget.isEditing ? 'Edit Salary Config' : 'Add Salary Config'),
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
                        value: _userId,
                        decoration: const InputDecoration(
                          labelText: 'Employee *',
                          prefixIcon: Icon(Icons.person),
                        ),
                        items: _employees
                            .map((e) => DropdownMenuItem(
                                value: e.id,
                                child: Text('${e.name} (${e.role})')))
                            .toList(),
                        onChanged: (v) => setState(() => _userId = v),
                        validator: (v) =>
                            v == null ? 'Select an employee' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _baseSalaryController,
                        decoration: const InputDecoration(
                          labelText: 'Base Salary *',
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
                      DropdownButtonFormField<String>(
                        value: _frequency,
                        decoration: const InputDecoration(
                          labelText: 'Payment Frequency',
                          prefixIcon: Icon(Icons.schedule),
                        ),
                        items: const [
                          DropdownMenuItem(
                              value: 'Monthly', child: Text('Monthly')),
                          DropdownMenuItem(
                              value: 'Bi-Weekly', child: Text('Bi-Weekly')),
                          DropdownMenuItem(
                              value: 'Weekly', child: Text('Weekly')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _frequency = v);
                        },
                      ),
                      const SizedBox(height: 24),
                      Text('Bank Details (Optional)',
                          style: AppTextStyles.labelLarge),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _bankNameController,
                        decoration: const InputDecoration(
                          labelText: 'Account Holder Name',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _bankAccountController,
                        decoration: const InputDecoration(
                          labelText: 'Account Number',
                          prefixIcon: Icon(Icons.account_balance),
                        ),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _ifscController,
                        decoration: const InputDecoration(
                          labelText: 'IFSC Code',
                          prefixIcon: Icon(Icons.code),
                        ),
                        textCapitalization: TextCapitalization.characters,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _upiIdController,
                        decoration: const InputDecoration(
                          labelText: 'UPI ID',
                          prefixIcon: Icon(Icons.phone_android),
                        ),
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
