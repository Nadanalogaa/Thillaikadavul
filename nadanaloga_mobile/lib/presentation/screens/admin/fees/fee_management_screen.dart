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
  List<CourseModel> _courses = [];
  List<BatchModel> _batches = [];
  bool _loadingCourses = true;
  Set<int?> _expandedCourses = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        _loadTab(_tabController.index);
      }
    });
    _loadCoursesAndBatches();
  }

  void _loadTab(int index) {
    final bloc = context.read<FeeBloc>();
    if (index == 0) {
      bloc.add(LoadFeeStructures());
    } else {
      bloc.add(LoadInvoices());
    }
  }

  Future<void> _loadCoursesAndBatches() async {
    try {
      final apiClient = sl<ApiClient>();
      final results = await Future.wait([
        apiClient.getCourses(),
        apiClient.getBatches(),
      ]);

      if (!mounted) return;

      // Parse courses
      if (results[0].statusCode == 200 && results[0].data is List) {
        _courses = (results[0].data as List)
            .map((c) => CourseModel.fromJson(c))
            .toList();
      }

      // Parse batches
      if (results[1].statusCode == 200 && results[1].data is List) {
        _batches = (results[1].data as List)
            .map((b) => BatchModel.fromJson(b))
            .toList();
      }

      setState(() {
        _loadingCourses = false;
        // Expand all courses by default
        _expandedCourses = _courses.map((c) => c.id).toSet();
      });
    } catch (e) {
      if (mounted) {
        setState(() => _loadingCourses = false);
      }
    }
  }

  Map<int?, List<FeeStructureModel>> _groupFeesByCourse(
      List<FeeStructureModel> fees) {
    final Map<int?, List<FeeStructureModel>> grouped = {};
    for (final fee in fees) {
      grouped.putIfAbsent(fee.courseId, () => []).add(fee);
    }
    return grouped;
  }

  String _getCourseName(int? courseId) {
    if (courseId == null) return 'Uncategorized';
    try {
      return _courses.firstWhere((c) => c.id == courseId).name;
    } catch (_) {
      return 'Unknown Course';
    }
  }

  List<String> _getBatchNames(List<int> batchIds) {
    return batchIds
        .map((id) {
          try {
            return _batches.firstWhere((b) => b.id == id).batchName;
          } catch (_) {
            return 'Batch #$id';
          }
        })
        .toList();
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
          if (_tabController.index == 0)
            IconButton(
              icon: Icon(_expandedCourses.length == _courses.length
                  ? Icons.unfold_less
                  : Icons.unfold_more),
              onPressed: () {
                setState(() {
                  if (_expandedCourses.length == _courses.length) {
                    _expandedCourses.clear();
                  } else {
                    _expandedCourses = _courses.map((c) => c.id).toSet();
                  }
                });
              },
              tooltip: _expandedCourses.length == _courses.length
                  ? 'Collapse All'
                  : 'Expand All',
            ),
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
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Discount Management Button (only show on Fee Structures tab)
          if (_tabController.index == 0)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: FloatingActionButton.extended(
                onPressed: () => context.push('/admin/fees/discounts'),
                icon: const Icon(Icons.local_offer),
                label: const Text('Discounts'),
                backgroundColor: AppColors.warning,
                heroTag: 'discounts',
              ),
            ),
          // Main FAB
          FloatingActionButton(
            onPressed: () {
              if (_tabController.index == 0) {
                context.push('/admin/fees/structures/add');
              } else {
                context.push('/admin/fees/invoices/add');
              }
            },
            child: const Icon(Icons.add),
            heroTag: 'add',
          ),
        ],
      ),
    );
  }

  Widget _buildStructuresTab(FeeState state) {
    if (state is FeeLoading || _loadingCourses) {
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

      final groupedFees = _groupFeesByCourse(state.structures);
      final sortedCourseIds = groupedFees.keys.toList()
        ..sort((a, b) {
          final nameA = _getCourseName(a);
          final nameB = _getCourseName(b);
          if (a == null) return 1;
          if (b == null) return -1;
          return nameA.compareTo(nameB);
        });

      return RefreshIndicator(
        onRefresh: () async {
          context.read<FeeBloc>().add(LoadFeeStructures());
          await _loadCoursesAndBatches();
        },
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: sortedCourseIds.length,
          itemBuilder: (context, index) {
            final courseId = sortedCourseIds[index];
            final fees = groupedFees[courseId]!;
            final courseName = _getCourseName(courseId);
            final isExpanded = _expandedCourses.contains(courseId);

            return _CourseSection(
              courseName: courseName,
              feeCount: fees.length,
              fees: fees,
              isExpanded: isExpanded,
              onToggle: () {
                setState(() {
                  if (isExpanded) {
                    _expandedCourses.remove(courseId);
                  } else {
                    _expandedCourses.add(courseId);
                  }
                });
              },
              onFeeDeleted: () {
                context.read<FeeBloc>().add(LoadFeeStructures());
              },
              getBatchNames: _getBatchNames,
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
                  backgroundColor:
                      _statusColor(inv.status).withValues(alpha: 0.15),
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
                            color:
                                _statusColor(inv.status).withValues(alpha: 0.12),
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

class _CourseSection extends StatelessWidget {
  final String courseName;
  final int feeCount;
  final List<FeeStructureModel> fees;
  final bool isExpanded;
  final VoidCallback onToggle;
  final VoidCallback onFeeDeleted;
  final List<String> Function(List<int>) getBatchNames;

  const _CourseSection({
    required this.courseName,
    required this.feeCount,
    required this.fees,
    required this.isExpanded,
    required this.onToggle,
    required this.onFeeDeleted,
    required this.getBatchNames,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        children: [
          // Course Header
          InkWell(
            onTap: onToggle,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.secondary.withValues(alpha: 0.08),
                    AppColors.secondary.withValues(alpha: 0.02),
                  ],
                ),
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.school,
                      color: AppColors.secondary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          courseName,
                          style: AppTextStyles.h4.copyWith(fontSize: 16),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '$feeCount ${feeCount == 1 ? 'fee structure' : 'fee structures'}',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.secondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: AppColors.secondary,
                    size: 28,
                  ),
                ],
              ),
            ),
          ),
          // Fee Structures List
          if (isExpanded)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: fees.map((fee) {
                  final batchNames = getBatchNames(fee.batchIds);
                  return _FeeStructureCard(
                    fee: fee,
                    batchNames: batchNames,
                    onDeleted: onFeeDeleted,
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }
}

class _FeeStructureCard extends StatelessWidget {
  final FeeStructureModel fee;
  final List<String> batchNames;
  final VoidCallback onDeleted;

  const _FeeStructureCard({
    required this.fee,
    required this.batchNames,
    required this.onDeleted,
  });

  String _formatFees() {
    final parts = <String>[];
    if (fee.monthlyFee != null) {
      parts.add('Monthly: \u20B9${fee.monthlyFee!.toStringAsFixed(0)}');
    }
    if (fee.quarterlyFee != null) {
      parts.add('Quarterly: \u20B9${fee.quarterlyFee!.toStringAsFixed(0)}');
    }
    if (fee.halfYearlyFee != null) {
      parts.add('Half-Yearly: \u20B9${fee.halfYearlyFee!.toStringAsFixed(0)}');
    }
    if (fee.annualFee != null) {
      parts.add('Annual: \u20B9${fee.annualFee!.toStringAsFixed(0)}');
    }
    return parts.isEmpty ? 'No fees set' : parts.join(' · ');
  }

  Color _modeColor(String mode) {
    switch (mode.toLowerCase()) {
      case 'online':
        return AppColors.info;
      case 'offline':
        return AppColors.success;
      case 'hybrid':
        return AppColors.warning;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with mode and actions
            Row(
              children: [
                if (fee.mode != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: _modeColor(fee.mode!).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      fee.mode!,
                      style: AppTextStyles.caption.copyWith(
                        color: _modeColor(fee.mode!),
                        fontWeight: FontWeight.w600,
                        fontSize: 11,
                      ),
                    ),
                  ),
                const Spacer(),
                PopupMenuButton<String>(
                  padding: EdgeInsets.zero,
                  onSelected: (value) async {
                    if (value == 'edit') {
                      context.push('/admin/fees/structures/${fee.id}/edit');
                    } else if (value == 'delete') {
                      final confirmed = await ConfirmDialog.show(
                        context,
                        title: 'Delete Fee Structure',
                        message: 'Delete this fee structure?',
                        confirmLabel: 'Delete',
                        confirmColor: AppColors.error,
                      );
                      if (confirmed == true && context.mounted) {
                        context.read<FeeBloc>().add(DeleteFeeStructure(fee.id));
                        onDeleted();
                      }
                    }
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'edit', child: Text('Edit')),
                    PopupMenuItem(
                      value: 'delete',
                      child:
                          Text('Delete', style: TextStyle(color: AppColors.error)),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Batch names (prominent)
            if (batchNames.isNotEmpty) ...[
              Row(
                children: [
                  const Icon(Icons.group_work, size: 14, color: AppColors.secondary),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      batchNames.join(', '),
                      style: AppTextStyles.labelLarge.copyWith(
                        fontSize: 13,
                        color: AppColors.secondary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
            ],
            // Fee amounts
            Text(
              _formatFees(),
              style: AppTextStyles.caption.copyWith(fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}
