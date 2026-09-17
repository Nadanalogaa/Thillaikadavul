import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/batch_model.dart';
import '../../../../data/models/course_model.dart';
import '../../../../data/models/grade_model.dart';
import '../../../../data/models/fee_structure_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/fee/fee_bloc.dart';
import '../../../bloc/fee/fee_event.dart';
import '../../../bloc/fee/fee_state.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';
import 'fees_roster_tab.dart';

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
  List<GradeModel> _grades = [];
  bool _loadingCourses = true;
  Set<int?> _expandedCourses = {};
  final _rosterKey = GlobalKey<FeesRosterTabState>();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    // Rebuild on tab change so the floating buttons match the visible tab.
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging && mounted) setState(() {});
    });
    _loadCoursesAndBatches();
  }

  Future<void> _clearOldInvoices() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Clear old (₹) invoices?'),
        content: const Text(
            'Deletes the old unpaid invoices that were NOT made from grades (the legacy ₹ ones). Paid invoices and grade-based invoices are kept. Then use "Generate this month\'s bills" to recreate them from grades.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Delete old'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      final r = await sl<ApiClient>().purgeLegacyInvoices();
      if (!mounted) return;
      final msg = r.data is Map ? (r.data['message'] ?? 'Cleared') : 'Cleared';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$msg — now tap Generate.'), backgroundColor: AppColors.success));
      _rosterKey.currentState?.reload();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: AppColors.error));
      }
    }
  }

  Future<void> _loadCoursesAndBatches() async {
    try {
      final apiClient = sl<ApiClient>();
      final results = await Future.wait([
        apiClient.getCourses(),
        apiClient.getBatches(),
        apiClient.getGrades(),
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

      // Parse grades
      if (results[2].statusCode == 200 && results[2].data is List) {
        _grades = (results[2].data as List)
            .map((g) => GradeModel.fromJson(g))
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
    final onFeesTab = _tabController.index == 0;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Fee Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long),
            tooltip: 'Payment Proofs',
            onPressed: () => context.push('/admin/fees/payments'),
          ),
          PopupMenuButton<String>(
            tooltip: 'Fee actions',
            onSelected: (v) {
              if (v == 'generate') {
                _tabController.animateTo(0);
                _rosterKey.currentState?.generateBills();
              }
              if (v == 'discounts') context.push('/admin/fees/discounts');
              if (v == 'clear') _clearOldInvoices();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: 'generate',
                child: ListTile(
                  leading: Icon(Icons.autorenew),
                  title: Text('Generate this month\'s bills'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              PopupMenuItem(
                value: 'discounts',
                child: ListTile(
                  leading: Icon(Icons.local_offer),
                  title: Text('Discounts'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              PopupMenuItem(
                value: 'clear',
                child: ListTile(
                  leading: Icon(Icons.delete_sweep, color: Colors.red),
                  title: Text('Clear old (₹) invoices'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          labelStyle: const TextStyle(fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: 'Fees'),
            Tab(text: 'Grades & Fees'),
          ],
        ),
      ),
      body: BlocListener<FeeBloc, FeeState>(
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
        child: TabBarView(
          controller: _tabController,
          children: [
            FeesRosterTab(key: _rosterKey),
            _buildGradesFeesTab(),
          ],
        ),
      ),
      // The Fees tab keeps its bottom edge free for the reminder bar; its
      // actions live on each card and in the app-bar menu.
      floatingActionButton: onFeesTab
          ? null
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
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
                FloatingActionButton.extended(
                  onPressed: () => context.push('/admin/grades'),
                  icon: const Icon(Icons.grade),
                  label: const Text('Grades'),
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

  Widget _buildGradesFeesTab() {
    if (_loadingCourses) {
      return const Center(child: CircularProgressIndicator());
    }
    final coursesWithGrades = _courses
        .where((c) => _grades.any((g) => g.courseId == c.id))
        .toList();
    return RefreshIndicator(
      onRefresh: _loadCoursesAndBatches,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Each grade sets its course fee. Assign a student a grade from their profile.',
                  ),
                ),
                TextButton(
                  onPressed: () => context.push('/admin/grades'),
                  child: const Text('Manage'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (coursesWithGrades.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(
                child: Text('No grades configured yet.\nTap "Manage" to add grades per course.',
                    textAlign: TextAlign.center),
              ),
            )
          else
            ...coursesWithGrades.map((c) {
              final grades = _grades.where((g) => g.courseId == c.id).toList();
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(c.name, style: AppTextStyles.labelLarge),
                      const SizedBox(height: 8),
                      ...grades.map((g) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(g.name, style: AppTextStyles.bodyMedium),
                                Text('₹${g.monthlyFee.toStringAsFixed(0)}/mo',
                                    style: AppTextStyles.bodyMedium.copyWith(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w600)),
                              ],
                            ),
                          )),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
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
                if (fee.grade != null && fee.grade!.isNotEmpty) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Grade: ${fee.grade!}',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
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
