import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/course_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/fee/fee_bloc.dart';
import '../../../bloc/fee/fee_event.dart';
import '../../../bloc/fee/fee_state.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';

class FeeManagementScreen extends StatefulWidget {
  const FeeManagementScreen({super.key});

  @override
  State<FeeManagementScreen> createState() => _FeeManagementScreenState();
}

class _FeeManagementScreenState extends State<FeeManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<int, String> _courseNames = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        _loadTab(_tabController.index);
      }
    });
    _loadCourseNames();
  }

  void _loadTab(int index) {
    final bloc = context.read<FeeBloc>();
    if (index == 0) {
      bloc.add(LoadFeeStructures());
    } else {
      bloc.add(LoadInvoices());
    }
  }

  Future<void> _loadCourseNames() async {
    try {
      final response = await sl<ApiClient>().getCourses();
      if (response.statusCode == 200) {
        final courses = (response.data as List)
            .map((j) => CourseModel.fromJson(j))
            .toList();
        if (mounted) {
          setState(() {
            _courseNames = {for (var c in courses) c.id: c.name};
          });
        }
      }
    } catch (_) {}
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
        title: const Text('Fee Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long),
            tooltip: 'Payment Proofs',
            onPressed: () => context.push('/admin/fees/payments'),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Fee Structures'),
            Tab(text: 'Invoices'),
          ],
        ),
      ),
      body: BlocConsumer<FeeBloc, FeeState>(
        listener: (context, state) {
          if (state is FeeOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is FeeError) {
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
              _buildStructuresTab(state),
              _buildInvoicesTab(state),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          if (_tabController.index == 0) {
            context.push('/admin/fees/structures/add');
          } else {
            context.push('/admin/fees/invoices/add');
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildStructuresTab(FeeState state) {
    if (state is FeeLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state is FeeStructuresLoaded) {
      if (state.structures.isEmpty) {
        return EmptyStateWidget(
          icon: Icons.receipt_long_outlined,
          title: 'No fee structures',
          subtitle: 'Create your first fee structure.',
          actionLabel: 'Add Fee Structure',
          onAction: () => context.push('/admin/fees/structures/add'),
        );
      }
      return RefreshIndicator(
        onRefresh: () async =>
            context.read<FeeBloc>().add(LoadFeeStructures()),
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: state.structures.length,
          itemBuilder: (context, index) {
            final fs = state.structures[index];
            final courseName = fs.courseId != null
                ? _courseNames[fs.courseId] ?? 'Course #${fs.courseId}'
                : 'All Courses';
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.receipt_long,
                      color: AppColors.secondary),
                ),
                title: Text(courseName, style: AppTextStyles.labelLarge),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (fs.mode != null)
                      Text('Mode: ${fs.mode}', style: AppTextStyles.caption),
                    Text(
                      _formatFees(fs),
                      style: AppTextStyles.caption,
                    ),
                  ],
                ),
                trailing: PopupMenuButton<String>(
                  onSelected: (value) async {
                    if (value == 'edit') {
                      context.push('/admin/fees/structures/${fs.id}/edit');
                    } else if (value == 'delete') {
                      final confirmed = await ConfirmDialog.show(
                        context,
                        title: 'Delete Fee Structure',
                        message: 'Delete this fee structure?',
                        confirmLabel: 'Delete',
                        confirmColor: AppColors.error,
                      );
                      if (confirmed == true && context.mounted) {
                        context.read<FeeBloc>().add(DeleteFeeStructure(fs.id));
                      }
                    }
                  },
                  itemBuilder: (_) => const [
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

  Widget _buildInvoicesTab(FeeState state) {
    if (state is FeeLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state is InvoicesLoaded) {
      if (state.invoices.isEmpty) {
        return EmptyStateWidget(
          icon: Icons.receipt_outlined,
          title: 'No invoices',
          subtitle: 'Create your first invoice.',
          actionLabel: 'Create Invoice',
          onAction: () => context.push('/admin/fees/invoices/add'),
        );
      }
      return RefreshIndicator(
        onRefresh: () async => context.read<FeeBloc>().add(LoadInvoices()),
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: state.invoices.length,
          itemBuilder: (context, index) {
            final inv = state.invoices[index];
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: _statusColor(inv.status).withValues(alpha: 0.15),
                  child: Icon(
                    inv.isPaid ? Icons.check : Icons.receipt,
                    color: _statusColor(inv.status),
                    size: 20,
                  ),
                ),
                title: Text(
                  inv.studentName ?? 'Student #${inv.studentId}',
                  style: AppTextStyles.labelLarge,
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (inv.courseName != null)
                      Text(inv.courseName!, style: AppTextStyles.caption),
                    Row(
                      children: [
                        Text(
                          '\u20B9${inv.amount?.toStringAsFixed(0) ?? '0'}',
                          style: AppTextStyles.bodyMedium
                              .copyWith(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: _statusColor(inv.status).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            inv.status.toUpperCase(),
                            style: AppTextStyles.caption.copyWith(
                              color: _statusColor(inv.status),
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (inv.dueDate != null)
                      Text(
                        'Due: ${inv.dueDate!.split('T').first}',
                        style: AppTextStyles.caption,
                      ),
                  ],
                ),
                trailing: inv.isPending
                    ? IconButton(
                        icon: const Icon(Icons.payment, color: AppColors.success),
                        onPressed: () =>
                            context.push('/admin/fees/invoices/${inv.id}/pay'),
                      )
                    : null,
              ),
            );
          },
        ),
      );
    }
    return const SizedBox.shrink();
  }

  String _formatFees(dynamic fs) {
    final parts = <String>[];
    if (fs.monthlyFee != null) {
      parts.add('Monthly: \u20B9${fs.monthlyFee!.toStringAsFixed(0)}');
    }
    if (fs.quarterlyFee != null) {
      parts.add('Quarterly: \u20B9${fs.quarterlyFee!.toStringAsFixed(0)}');
    }
    if (fs.halfYearlyFee != null) {
      parts.add('Half-Yearly: \u20B9${fs.halfYearlyFee!.toStringAsFixed(0)}');
    }
    if (fs.annualFee != null) {
      parts.add('Annual: \u20B9${fs.annualFee!.toStringAsFixed(0)}');
    }
    return parts.isEmpty ? 'No fees set' : parts.join(' · ');
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'paid':
        return AppColors.success;
      case 'overdue':
        return AppColors.error;
      case 'pending':
      default:
        return AppColors.warning;
    }
  }
}
