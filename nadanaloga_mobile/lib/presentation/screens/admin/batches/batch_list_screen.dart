import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/batch_model.dart';
import '../../../../data/models/course_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/batch/batch_bloc.dart';
import '../../../bloc/batch/batch_event.dart';
import '../../../bloc/batch/batch_state.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';

class BatchListScreen extends StatefulWidget {
  const BatchListScreen({super.key});

  @override
  State<BatchListScreen> createState() => _BatchListScreenState();
}

class _BatchListScreenState extends State<BatchListScreen> {
  List<CourseModel> _courses = [];
  bool _loadingCourses = true;
  Set<int?> _expandedCourses = {};

  @override
  void initState() {
    super.initState();
    _loadCourses();
  }

  Future<void> _loadCourses() async {
    try {
      final apiClient = sl<ApiClient>();
      final response = await apiClient.getCourses();
      if (response.statusCode == 200 && response.data is List) {
        if (!mounted) return;
        setState(() {
          _courses = (response.data as List)
              .map((c) => CourseModel.fromJson(c))
              .toList();
          _loadingCourses = false;
          // Expand all courses by default
          _expandedCourses = _courses.map((c) => c.id).toSet();
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingCourses = false);
    }
  }

  Map<int?, List<BatchModel>> _groupBatchesByCourse(List<BatchModel> batches) {
    final Map<int?, List<BatchModel>> grouped = {};
    for (final batch in batches) {
      grouped.putIfAbsent(batch.courseId, () => []).add(batch);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Batches'),
        automaticallyImplyLeading: false,
        actions: [
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
        ],
      ),
      body: BlocConsumer<BatchBloc, BatchState>(
        listener: (context, state) {
          if (state is BatchOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is BatchError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is BatchLoading || _loadingCourses) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is BatchLoaded) {
            if (state.batches.isEmpty) {
              return EmptyStateWidget(
                icon: Icons.group_work_outlined,
                title: 'No batches yet',
                subtitle: 'Create your first batch.',
                actionLabel: 'Create Batch',
                onAction: () async {
                  final created = await context.push<bool>('/admin/batches/add');
                  if (created == true && context.mounted) {
                    context.read<BatchBloc>().add(LoadBatches());
                  }
                },
              );
            }

            final groupedBatches = _groupBatchesByCourse(state.batches);
            final sortedCourseIds = groupedBatches.keys.toList()
              ..sort((a, b) {
                final nameA = _getCourseName(a);
                final nameB = _getCourseName(b);
                // Put uncategorized last
                if (a == null) return 1;
                if (b == null) return -1;
                return nameA.compareTo(nameB);
              });

            return RefreshIndicator(
              onRefresh: () async {
                context.read<BatchBloc>().add(LoadBatches());
                await _loadCourses();
              },
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: sortedCourseIds.length,
                itemBuilder: (context, index) {
                  final courseId = sortedCourseIds[index];
                  final batches = groupedBatches[courseId]!;
                  final courseName = _getCourseName(courseId);
                  final isExpanded = _expandedCourses.contains(courseId);

                  return _CourseSection(
                    courseName: courseName,
                    batchCount: batches.length,
                    batches: batches,
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
                    onBatchDeleted: () {
                      context.read<BatchBloc>().add(LoadBatches());
                    },
                  );
                },
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final created = await context.push<bool>('/admin/batches/add');
          if (created == true && context.mounted) {
            context.read<BatchBloc>().add(LoadBatches());
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _CourseSection extends StatelessWidget {
  final String courseName;
  final int batchCount;
  final List<BatchModel> batches;
  final bool isExpanded;
  final VoidCallback onToggle;
  final VoidCallback onBatchDeleted;

  const _CourseSection({
    required this.courseName,
    required this.batchCount,
    required this.batches,
    required this.isExpanded,
    required this.onToggle,
    required this.onBatchDeleted,
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
                    AppColors.primary.withValues(alpha: 0.08),
                    AppColors.primary.withValues(alpha: 0.02),
                  ],
                ),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.school,
                      color: AppColors.primary,
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
                          '$batchCount ${batchCount == 1 ? 'batch' : 'batches'}',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: AppColors.primary,
                    size: 28,
                  ),
                ],
              ),
            ),
          ),
          // Batches Grid
          if (isExpanded)
            Padding(
              padding: const EdgeInsets.all(12),
              child: GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.85,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                ),
                itemCount: batches.length,
                itemBuilder: (context, index) {
                  return _BatchGridCard(
                    batch: batches[index],
                    onDeleted: onBatchDeleted,
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _BatchGridCard extends StatelessWidget {
  final BatchModel batch;
  final VoidCallback onDeleted;

  const _BatchGridCard({
    required this.batch,
    required this.onDeleted,
  });

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
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: () => context.push('/admin/batches/${batch.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with icon and menu
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.group_work,
                      color: AppColors.primary,
                      size: 18,
                    ),
                  ),
                  const Spacer(),
                  PopupMenuButton<String>(
                    padding: EdgeInsets.zero,
                    iconSize: 18,
                    onSelected: (value) async {
                      if (value == 'delete') {
                        final confirmed = await ConfirmDialog.show(
                          context,
                          title: 'Delete Batch',
                          message: 'Delete "${batch.batchName}"?',
                          confirmLabel: 'Delete',
                          confirmColor: AppColors.error,
                        );
                        if (confirmed == true && context.mounted) {
                          context.read<BatchBloc>().add(DeleteBatch(batch.id));
                          onDeleted();
                        }
                      }
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(
                        value: 'delete',
                        child: Text(
                          'Delete',
                          style: TextStyle(color: AppColors.error),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),
              // Batch name
              Text(
                batch.batchName,
                style: AppTextStyles.labelLarge.copyWith(fontSize: 13),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const Spacer(),
              // Student count
              Row(
                children: [
                  const Icon(Icons.people, size: 13, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    '${batch.allStudentIds.length}',
                    style: AppTextStyles.caption.copyWith(fontSize: 11),
                  ),
                  if (batch.maxStudents != null)
                    Text(
                      '/${batch.maxStudents}',
                      style: AppTextStyles.caption.copyWith(fontSize: 11),
                    ),
                ],
              ),
              // Schedule
              if (batch.formattedSchedule.isNotEmpty) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.schedule, size: 13, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        batch.formattedSchedule,
                        style: AppTextStyles.caption.copyWith(
                          fontSize: 10,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
              // Mode badge
              if (batch.mode != null) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: _modeColor(batch.mode!).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    batch.mode!,
                    style: AppTextStyles.caption.copyWith(
                      color: _modeColor(batch.mode!),
                      fontWeight: FontWeight.w600,
                      fontSize: 10,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
