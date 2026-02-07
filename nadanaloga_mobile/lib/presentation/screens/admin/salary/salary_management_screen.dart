import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../bloc/salary/salary_bloc.dart';
import '../../../bloc/salary/salary_event.dart';
import '../../../bloc/salary/salary_state.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';

class SalaryManagementScreen extends StatefulWidget {
  const SalaryManagementScreen({super.key});

  @override
  State<SalaryManagementScreen> createState() => _SalaryManagementScreenState();
}

class _SalaryManagementScreenState extends State<SalaryManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        _loadTab(_tabController.index);
      }
    });
  }

  void _loadTab(int index) {
    final bloc = context.read<SalaryBloc>();
    if (index == 0) {
      bloc.add(LoadSalaries());
    } else {
      bloc.add(LoadSalaryPayments());
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Salary Management'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Salary Configs'),
            Tab(text: 'Payment History'),
          ],
        ),
      ),
      body: BlocConsumer<SalaryBloc, SalaryState>(
        listener: (context, state) {
          if (state is SalaryOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is SalaryError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          return TabBarView(
            controller: _tabController,
            children: [
              _buildConfigsTab(state),
              _buildPaymentsTab(state),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final route = _tabController.index == 0
              ? '/admin/salary/add'
              : '/admin/salary/pay';
          final created = await context.push<bool>(route);
          if (created == true && context.mounted) {
            _loadTab(_tabController.index);
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildConfigsTab(SalaryState state) {
    if (state is SalaryLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state is SalariesLoaded) {
      if (state.salaries.isEmpty) {
          return EmptyStateWidget(
            icon: Icons.account_balance_wallet_outlined,
            title: 'No salary configs',
            subtitle: 'Set up salary for your staff.',
            actionLabel: 'Add Salary Config',
            onAction: () async {
              final created = await context.push<bool>('/admin/salary/add');
              if (created == true && context.mounted) {
                _loadTab(_tabController.index);
              }
            },
          );
        }
      return RefreshIndicator(
        onRefresh: () async =>
            context.read<SalaryBloc>().add(LoadSalaries()),
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: state.salaries.length,
          itemBuilder: (context, index) {
            final sal = state.salaries[index];
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                  child: Text(
                    (sal.employeeName ?? '?')[0].toUpperCase(),
                    style: const TextStyle(
                        color: AppColors.primary, fontWeight: FontWeight.w600),
                  ),
                ),
                title: Text(
                  sal.employeeName ?? 'Employee #${sal.userId}',
                  style: AppTextStyles.labelLarge,
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '\u20B9${sal.baseSalary?.toStringAsFixed(0) ?? '0'} / ${sal.paymentFrequency ?? 'Monthly'}',
                      style: AppTextStyles.bodyMedium
                          .copyWith(fontWeight: FontWeight.w600),
                    ),
                    if (sal.bankAccountName != null)
                      Text('Bank: ${sal.bankAccountName}',
                          style: AppTextStyles.caption),
                    if (sal.upiId != null)
                      Text('UPI: ${sal.upiId}',
                          style: AppTextStyles.caption),
                  ],
                ),
                trailing: PopupMenuButton<String>(
                  onSelected: (value) async {
                    if (value == 'edit') {
                      final updated = await context
                          .push<bool>('/admin/salary/${sal.id}/edit');
                      if (updated == true && context.mounted) {
                        _loadTab(_tabController.index);
                      }
                    } else if (value == 'pay') {
                      final created = await context
                          .push<bool>('/admin/salary/pay?salaryId=${sal.id}');
                      if (created == true && context.mounted) {
                        _loadTab(_tabController.index);
                      }
                    } else if (value == 'delete') {
                      final confirmed = await ConfirmDialog.show(
                        context,
                        title: 'Delete Salary Config',
                        message:
                            'Delete salary config for ${sal.employeeName}?',
                        confirmLabel: 'Delete',
                        confirmColor: AppColors.error,
                      );
                      if (confirmed == true && context.mounted) {
                        context.read<SalaryBloc>().add(DeleteSalary(sal.id));
                      }
                    }
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'pay', child: Text('Record Payment')),
                    PopupMenuItem(value: 'edit', child: Text('Edit')),
                    PopupMenuItem(
                      value: 'delete',
                      child: Text('Delete',
                          style: TextStyle(color: AppColors.error)),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );
    }
    return const SizedBox.shrink();
  }

  Widget _buildPaymentsTab(SalaryState state) {
    if (state is SalaryLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state is SalaryPaymentsLoaded) {
      if (state.payments.isEmpty) {
        return EmptyStateWidget(
          icon: Icons.payment_outlined,
          title: 'No payments recorded',
          subtitle: 'Record your first salary payment.',
          actionLabel: 'Record Payment',
          onAction: () async {
            final created = await context.push<bool>('/admin/salary/pay');
            if (created == true && context.mounted) {
              _loadTab(_tabController.index);
            }
          },
        );
      }
      return RefreshIndicator(
        onRefresh: () async =>
            context.read<SalaryBloc>().add(LoadSalaryPayments()),
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: state.payments.length,
          itemBuilder: (context, index) {
            final pay = state.payments[index];
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppColors.success.withValues(alpha: 0.15),
                  child: const Icon(Icons.check, color: AppColors.success, size: 20),
                ),
                title: Text(
                  pay.employeeName ?? 'Employee #${pay.userId}',
                  style: AppTextStyles.labelLarge,
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '\u20B9${pay.amount?.toStringAsFixed(0) ?? '0'}',
                      style: AppTextStyles.bodyMedium
                          .copyWith(fontWeight: FontWeight.w600),
                    ),
                    Row(
                      children: [
                        if (pay.paymentPeriod != null)
                          Text(pay.paymentPeriod!,
                              style: AppTextStyles.caption),
                        if (pay.paymentDate != null) ...[
                          if (pay.paymentPeriod != null)
                            Text(' · ', style: AppTextStyles.caption),
                          Text(pay.paymentDate!.split('T').first,
                              style: AppTextStyles.caption),
                        ],
                      ],
                    ),
                    if (pay.paymentMethod != null)
                      Text('Via: ${pay.paymentMethod}',
                          style: AppTextStyles.caption),
                  ],
                ),
              ),
            );
          },
        ),
      );
    }
    return const SizedBox.shrink();
  }
}
