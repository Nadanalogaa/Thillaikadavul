import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../data/models/batch_model.dart';
import '../../../../data/models/course_model.dart';
import '../../../bloc/batch/batch_bloc.dart';
import '../../../bloc/batch/batch_event.dart';
import '../../../bloc/batch/batch_state.dart';
import '../../../bloc/course/course_bloc.dart';
import '../../../bloc/course/course_event.dart';
import '../../../bloc/course/course_state.dart';
import '../../../widgets/empty_state_widget.dart';

class BatchesDrilldownScreen extends StatefulWidget {
  const BatchesDrilldownScreen({super.key});

  @override
  State<BatchesDrilldownScreen> createState() => _BatchesDrilldownScreenState();
}

class _BatchesDrilldownScreenState extends State<BatchesDrilldownScreen> {
  String? _selectedCourse;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    context.read<BatchBloc>().add(LoadBatches());
    context.read<CourseBloc>().add(LoadCourses());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Batches'),
        centerTitle: true,
      ),
      body: BlocBuilder<CourseBloc, CourseState>(
        builder: (context, courseState) {
          return BlocBuilder<BatchBloc, BatchState>(
            builder: (context, batchState) {
              if (courseState is CourseLoading || batchState is BatchLoading) {
                return const Center(child: CircularProgressIndicator());
              }

              final courses = courseState is CourseLoaded ? courseState.courses : <CourseModel>[];
              final batches = batchState is BatchLoaded ? batchState.batches : <BatchModel>[];

              // Group batches by course
              final courseBatches = <String, List<BatchModel>>{};
              for (final course in courses) {
                courseBatches[course.name] = batches
                    .where((b) => b.courseId == course.id)
                    .toList();
              }
              // Unassigned batches
              final assignedCourseIds = courses.map((c) => c.id).toSet();
              final unassignedBatches =
                  batches.where((b) => !assignedCourseIds.contains(b.courseId)).toList();
              if (unassignedBatches.isNotEmpty) {
                courseBatches['Other'] = unassignedBatches;
              }

              // Filter by selected course
              List<BatchModel> displayBatches;
              if (_selectedCourse == null || _selectedCourse == 'All') {
                displayBatches = batches;
              } else {
                displayBatches = courseBatches[_selectedCourse] ?? [];
              }

              // Apply search
              if (_searchQuery.isNotEmpty) {
                final query = _searchQuery.toLowerCase();
                displayBatches = displayBatches.where((b) {
                  final courseName = courses
                      .where((c) => c.id == b.courseId)
                      .map((c) => c.name)
                      .firstOrNull ?? '';
                  return b.batchName.toLowerCase().contains(query) ||
                      courseName.toLowerCase().contains(query) ||
                      (b.mode?.toLowerCase().contains(query) ?? false);
                }).toList();
              }

              return Column(
                children: [
                  // Search Bar
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    color: Colors.white,
                    child: TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: 'Search batches...',
                        hintStyle: AppTextStyles.bodySmall.copyWith(color: AppColors.textHint),
                        prefixIcon: const Icon(Icons.search, size: 20),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 20),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                              )
                            : null,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: AppColors.divider),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: AppColors.divider),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                        ),
                        filled: true,
                        fillColor: AppColors.background,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        isDense: true,
                      ),
                      style: AppTextStyles.bodyMedium,
                      onChanged: (value) => setState(() => _searchQuery = value),
                    ),
                  ),

                  // Course Filter Chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: Row(
                      children: [
                        _CompactFilterChip(
                          label: 'All',
                          count: batches.length,
                          isSelected: _selectedCourse == null || _selectedCourse == 'All',
                          onTap: () => setState(() => _selectedCourse = 'All'),
                        ),
                        ...courseBatches.entries.map((entry) {
                          return _CompactFilterChip(
                            label: entry.key,
                            count: entry.value.length,
                            isSelected: _selectedCourse == entry.key,
                            onTap: () => setState(() => _selectedCourse = entry.key),
                          );
                        }),
                      ],
                    ),
                  ),

                  // Compact Summary Card
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: _CompactSummaryCard(
                      totalBatches: displayBatches.length,
                      totalStudents: displayBatches.fold<int>(
                        0,
                        (sum, b) => sum + (b.studentIds.length),
                      ),
                    ).animate().fadeIn(duration: 200.ms),
                  ),

                  const SizedBox(height: 8),

                  // Batches List with Accordion
                  Expanded(
                    child: displayBatches.isEmpty
                        ? const EmptyStateWidget(
                            icon: Icons.group_work_outlined,
                            title: 'No Batches',
                            subtitle: 'No batches found for selected filter',
                          )
                        : RefreshIndicator(
                            onRefresh: () async {
                              context.read<BatchBloc>().add(LoadBatches());
                            },
                            child: ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              itemCount: displayBatches.length,
                              itemBuilder: (context, index) {
                                final batch = displayBatches[index];
                                final courseName = courses
                                    .where((c) => c.id == batch.courseId)
                                    .map((c) => c.name)
                                    .firstOrNull;
                                return _AccordionBatchCard(
                                  batch: batch,
                                  index: index,
                                  courseName: courseName,
                                );
                              },
                            ),
                          ),
                  ),
                ],
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.small(
        onPressed: () async {
          final created = await context.push<bool>('/admin/batches/add');
          if (created == true && context.mounted) {
            context.read<BatchBloc>().add(LoadBatches());
          }
        },
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, size: 20),
      ).animate().scale(delay: 300.ms, duration: 200.ms),
    );
  }
}

class _CompactFilterChip extends StatelessWidget {
  final String label;
  final int count;
  final bool isSelected;
  final VoidCallback onTap;

  const _CompactFilterChip({
    required this.label,
    required this.count,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.divider,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: AppTextStyles.caption.copyWith(
                  color: isSelected ? Colors.white : AppColors.textPrimary,
                  fontWeight: FontWeight.w500,
                  fontSize: 11,
                ),
              ),
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white.withOpacity(0.3) : AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CompactSummaryCard extends StatelessWidget {
  final int totalBatches;
  final int totalStudents;

  const _CompactSummaryCard({
    required this.totalBatches,
    required this.totalStudents,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.group_work, color: Colors.white, size: 24),
          const SizedBox(width: 10),
          Text(
            '$totalBatches',
            style: AppTextStyles.h2.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 6),
          Text('Batches', style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
          const Spacer(),
          Container(width: 1, height: 30, color: Colors.white24),
          const Spacer(),
          const Icon(Icons.people, color: Colors.white, size: 24),
          const SizedBox(width: 10),
          Text(
            '$totalStudents',
            style: AppTextStyles.h2.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 6),
          Text('Students', style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
        ],
      ),
    );
  }
}

class _AccordionBatchCard extends StatefulWidget {
  final BatchModel batch;
  final int index;
  final String? courseName;

  const _AccordionBatchCard({
    required this.batch,
    required this.index,
    this.courseName,
  });

  @override
  State<_AccordionBatchCard> createState() => _AccordionBatchCardState();
}

class _AccordionBatchCardState extends State<_AccordionBatchCard> {
  bool _isExpanded = false;

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final batch = widget.batch;
    final studentCount = batch.studentIds.length;
    final capacity = batch.maxStudents ?? 0;
    final fillPercentage = capacity > 0 ? (studentCount / capacity) : 0.0;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: _isExpanded ? AppColors.primary.withOpacity(0.3) : AppColors.divider.withOpacity(0.5),
        ),
      ),
      child: Column(
        children: [
          // Collapsed Header - Name, Course, Student count
          InkWell(
            onTap: () => setState(() => _isExpanded = !_isExpanded),
            borderRadius: BorderRadius.vertical(
              top: const Radius.circular(12),
              bottom: Radius.circular(_isExpanded ? 0 : 12),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  // Icon
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.group_work, color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: 10),

                  // Name & Course
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          batch.batchName,
                          style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Row(
                          children: [
                            if (widget.courseName != null) ...[
                              Text(
                                widget.courseName!,
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w500,
                                  fontSize: 11,
                                ),
                              ),
                              const SizedBox(width: 8),
                            ],
                            Icon(Icons.people, size: 12, color: AppColors.textSecondary),
                            const SizedBox(width: 4),
                            Text(
                              '$studentCount${capacity > 0 ? '/$capacity' : ''}',
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.textSecondary,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Mode Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: batch.mode == 'Online'
                          ? AppColors.info.withOpacity(0.1)
                          : batch.mode == 'Offline'
                              ? AppColors.success.withOpacity(0.1)
                              : AppColors.warning.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      batch.mode ?? 'Hybrid',
                      style: AppTextStyles.caption.copyWith(
                        color: batch.mode == 'Online'
                            ? AppColors.info
                            : batch.mode == 'Offline'
                                ? AppColors.success
                                : AppColors.warning,
                        fontWeight: FontWeight.w600,
                        fontSize: 9,
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),

                  // Expand Arrow
                  AnimatedRotation(
                    turns: _isExpanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      Icons.keyboard_arrow_down,
                      color: AppColors.textSecondary,
                      size: 24,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Expanded Details
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Container(
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
              ),
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Column(
                children: [
                  const Divider(height: 1),
                  const SizedBox(height: 10),

                  // Capacity Progress
                  if (capacity > 0) ...[
                    Row(
                      children: [
                        Text(
                          'Capacity',
                          style: AppTextStyles.caption.copyWith(color: AppColors.textHint, fontSize: 10),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(3),
                            child: LinearProgressIndicator(
                              value: fillPercentage.clamp(0.0, 1.0),
                              backgroundColor: AppColors.divider,
                              valueColor: AlwaysStoppedAnimation(
                                fillPercentage >= 1.0
                                    ? AppColors.error
                                    : fillPercentage >= 0.8
                                        ? AppColors.warning
                                        : AppColors.success,
                              ),
                              minHeight: 5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${(fillPercentage * 100).toInt()}%',
                          style: AppTextStyles.caption.copyWith(
                            color: fillPercentage >= 0.8 ? AppColors.warning : AppColors.success,
                            fontWeight: FontWeight.w600,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                  ],

                  // Details
                  Row(
                    children: [
                      Expanded(
                        child: _CompactInfoItem(
                          icon: Icons.calendar_today_outlined,
                          label: 'Start',
                          value: _formatDate(batch.startDate),
                        ),
                      ),
                      Expanded(
                        child: _CompactInfoItem(
                          icon: Icons.event_outlined,
                          label: 'End',
                          value: _formatDate(batch.endDate),
                        ),
                      ),
                    ],
                  ),

                  if (batch.schedule.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.schedule, size: 14, color: AppColors.textSecondary),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            batch.schedule.map((s) => s.timing ?? '').where((t) => t.isNotEmpty).join(', '),
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],

                  const SizedBox(height: 12),

                  // Action Button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => context.push('/admin/batches/${batch.id}'),
                      icon: const Icon(Icons.visibility, size: 16),
                      label: const Text('View Details'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: BorderSide(color: AppColors.primary.withOpacity(0.5)),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        textStyle: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            crossFadeState: _isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    ).animate(delay: Duration(milliseconds: 30 * widget.index)).fadeIn(duration: 200.ms);
  }
}

class _CompactInfoItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _CompactInfoItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: AppTextStyles.caption.copyWith(color: AppColors.textHint, fontSize: 9),
              ),
              Text(
                value,
                style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.w500, fontSize: 11),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
